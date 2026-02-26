import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'

type Bindings = {
    DB: D1Database
    JWT_SECRET: string
}

type UserPayload = {
    id: string
    role: 'DIRECTOR' | 'PROFESSOR'
    exp: number
}

const app = new Hono<{ Bindings: Bindings, Variables: { user: UserPayload } }>()

app.use('/api/*', cors())

async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

app.post('/api/login', async (c) => {
    const { username, password } = await c.req.json()
    const hashed = await hashPassword(password)

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?').bind(username, hashed).first()

    if (!user) {
        return c.json({ error: 'Credenciales inválidas' }, 401)
    }

    const payload: UserPayload = {
        id: user.id as string,
        role: user.role as 'DIRECTOR' | 'PROFESSOR',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 hours
    }

    const token = await sign(payload, c.env.JWT_SECRET)

    return c.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
        }
    })
})

// Middleware for authentication
app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/login') return next()

    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'No autorizado' }, 401)
    }

    const token = authHeader.split(' ')[1]
    try {
        const payload = await verify(token, c.env.JWT_SECRET)
        c.set('user', payload as UserPayload)
        await next()
    } catch (e) {
        return c.json({ error: 'Token inválido o expirado' }, 401)
    }
})

// ----- USERS -----
app.get('/api/users', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const { results } = await c.env.DB.prepare('SELECT id, name, username, role, created_at FROM users').all()
    return c.json(results)
})

app.post('/api/users', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const { name, username, password, role } = await c.req.json()
    const id = crypto.randomUUID()
    const hashed = await hashPassword(password)

    await c.env.DB.prepare('INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)')
        .bind(id, name, username, hashed, role).run()

    return c.json({ id, name, username, role }, 201)
})

app.put('/api/users/:id', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const id = c.req.param('id')
    const { name, password, role } = await c.req.json()

    if (password) {
        const hashed = await hashPassword(password)
        await c.env.DB.prepare('UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?')
            .bind(name, hashed, role, id).run()
    } else {
        await c.env.DB.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?')
            .bind(name, role, id).run()
    }
    return c.json({ success: true })
})

app.delete('/api/users/:id', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    return c.json({ success: true })
})

// ----- CLASSES -----
app.get('/api/classes', async (c) => {
    const user = c.get('user')
    if (user.role === 'DIRECTOR') {
        const { results } = await c.env.DB.prepare('SELECT * FROM classes').all()
        return c.json(results)
    } else {
        const { results } = await c.env.DB.prepare('SELECT * FROM classes WHERE professor_id = ?').bind(user.id).all()
        return c.json(results)
    }
})

app.post('/api/classes', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)
    const { name, grade, professor_id } = await c.req.json()
    const id = crypto.randomUUID()

    await c.env.DB.prepare('INSERT INTO classes (id, name, grade, professor_id) VALUES (?, ?, ?, ?)')
        .bind(id, name, grade, professor_id).run()

    return c.json({ id, name, grade, professor_id }, 201)
})

app.put('/api/classes/:id', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const id = c.req.param('id')
    const { name, grade, professor_id } = await c.req.json()

    await c.env.DB.prepare('UPDATE classes SET name = ?, grade = ?, professor_id = ? WHERE id = ?')
        .bind(name, grade, professor_id, id).run()
    return c.json({ success: true })
})

app.delete('/api/classes/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(id).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    await c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run()
    return c.json({ success: true })
})

// ----- STUDENTS -----
app.get('/api/students/:classId', async (c) => {
    const user = c.get('user')
    const classId = c.req.param('classId')

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(classId).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    const { results } = await c.env.DB.prepare('SELECT * FROM students WHERE class_id = ?').bind(classId).all()
    return c.json(results)
})

app.post('/api/students', async (c) => {
    const user = c.get('user')
    const { name, class_id } = await c.req.json()

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(class_id).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    const id = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO students (id, name, class_id) VALUES (?, ?, ?)')
        .bind(id, name, class_id).run()

    return c.json({ id, name, class_id }, 201)
})

app.delete('/api/students/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    if (user.role === 'PROFESSOR') {
        const student = await c.env.DB.prepare('SELECT class_id FROM students WHERE id = ?').bind(id).first()
        if (!student) return c.json({ error: 'Not Found' }, 404)
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(student.class_id).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run()
    return c.json({ success: true })
})

// ----- ATTENDANCE -----
app.get('/api/attendance', async (c) => {
    const classId = c.req.query('classId')
    const date = c.req.query('date')
    const user = c.get('user')

    if (!classId || !date) return c.json({ error: 'Faltan parámetros classId o date' }, 400)

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(classId).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    const { results } = await c.env.DB.prepare('SELECT * FROM attendance WHERE class_id = ? AND date = ?').bind(classId, date).all()
    return c.json(results)
})

app.post('/api/attendance', async (c) => {
    const user = c.get('user')
    const { class_id, date, records } = await c.req.json() // records: [{student_id, status}]

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(class_id).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    // To avoid duplicates, insert or replace using the UNIQUE constraint on (class_id, student_id, date)
    const stmts = records.map((r: any) => {
        return c.env.DB.prepare('INSERT OR REPLACE INTO attendance (id, student_id, class_id, date, status) VALUES (COALESCE((SELECT id FROM attendance WHERE class_id = ? AND student_id = ? AND date = ?), ?), ?, ?, ?, ?)')
            .bind(
                class_id, r.student_id, date, crypto.randomUUID(),
                r.student_id, class_id, date, r.status
            )
    })

    await c.env.DB.batch(stmts)
    return c.json({ success: true })
})

app.delete('/api/attendance/:classId/:date', async (c) => {
    const user = c.get('user')
    const classId = c.req.param('classId')
    const date = c.req.param('date')

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(classId).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    await c.env.DB.prepare('DELETE FROM attendance WHERE class_id = ? AND date = ?').bind(classId, date).run()
    return c.json({ success: true })
})

// ----- REPORTS -----
app.get('/api/reports', async (c) => {
    const from = c.req.query('from')
    const to = c.req.query('to')
    const user = c.get('user')

    if (!from || !to) return c.json({ error: 'Faltan fechas from o to' }, 400)

    let classCondition = ""
    let bindParams: string[] = [from, to]

    if (user.role === 'PROFESSOR') {
        classCondition = "AND c.professor_id = ?"
        bindParams.push(user.id)
    }

    // Agregación por estado
    const q = `
    SELECT a.class_id, a.status, COUNT(*) as count, c.name as class_name
    FROM attendance a
    JOIN classes c ON a.class_id = c.id
    WHERE a.date >= ? AND a.date <= ? ${classCondition}
    GROUP BY a.class_id, a.status
  `
    const { results: agg } = await c.env.DB.prepare(q).bind(...bindParams).all()

    // Alumnos en riesgo (asistencia < 75%)
    const riskQuery = `
    SELECT s.id, s.name, a.class_id, c.name as class_name,
           SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present,
           COUNT(*) as total
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON a.class_id = c.id
    WHERE a.date >= ? AND a.date <= ? ${classCondition}
    GROUP BY s.id
    HAVING (CAST(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) < 0.75
  `

    const { results: riskStudents } = await c.env.DB.prepare(riskQuery).bind(...bindParams).all()

    return c.json({
        aggregation: agg,
        riskStudents
    })
})

export default app
