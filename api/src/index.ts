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

app.onError((err, c) => {
    console.error('Unhandled Server Error:', err.message);
    return c.json({ error: `Error interno del servidor: ${err.message}` }, 500);
})

app.notFound((c) => {
    return c.json({ error: 'Ruta no encontrada' }, 404);
})

app.use(
    '/api/*',
    cors({
        origin: '*', // En producción podrías restringirlo a 'https://adsum.pages.dev'
        allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
        allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
        exposeHeaders: ['Content-Length'],
        maxAge: 600,
        credentials: true,
    })
)

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
    // Exclude login and CORS preflight options
    if (c.req.method === 'OPTIONS' || c.req.path === '/api/login') {
        return next()
    }

    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'No autorizado' }, 401)
    }

    const token = authHeader.split(' ')[1]
    try {
        const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
        c.set('user', payload as UserPayload)
        await next()
    } catch (e: any) {
        return c.json({ error: 'Token inválido' }, 401)
    }
})

// ----- USERS -----
app.get('/api/users', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const { results } = await c.env.DB.prepare('SELECT id, name, username, role, created_at FROM users').all()
    return c.json(results)
})

// ----- INIT (N+1 Fix) -----
app.get('/api/init', async (c) => {
    const user = c.get('user')
    let usersQuery: any[] = []
    let classesQuery: any[] = []
    let studentsQuery: any[] = []
    let attendanceQuery: any[] = []

    if (user.role === 'DIRECTOR') {
        const [u, cl, st, at] = await c.env.DB.batch([
            c.env.DB.prepare('SELECT id, name, username, role, created_at FROM users'),
            c.env.DB.prepare('SELECT * FROM classes'),
            c.env.DB.prepare('SELECT * FROM students'),
            c.env.DB.prepare('SELECT * FROM attendance')
        ])
        usersQuery = u.results
        classesQuery = cl.results
        studentsQuery = st.results
        attendanceQuery = at.results
    } else {
        const [cl, st, at] = await c.env.DB.batch([
            c.env.DB.prepare('SELECT * FROM classes WHERE professor_id = ?').bind(user.id),
            c.env.DB.prepare('SELECT s.* FROM students s JOIN classes c ON s.class_id = c.id WHERE c.professor_id = ?').bind(user.id),
            c.env.DB.prepare('SELECT a.* FROM attendance a JOIN classes c ON a.class_id = c.id WHERE c.professor_id = ?').bind(user.id)
        ])
        classesQuery = cl.results
        studentsQuery = st.results
        attendanceQuery = at.results
    }

    return c.json({
        users: usersQuery || [],
        classes: classesQuery || [],
        students: studentsQuery || [],
        attendance: attendanceQuery || []
    })
})

app.post('/api/users', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const { name, username, password, role } = await c.req.json()
    const id = crypto.randomUUID()
    const hashed = await hashPassword(password)

    try {
        await c.env.DB.prepare('INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)')
            .bind(id, name, username, hashed, role).run()
    } catch (err: any) {
        // sqlite / D1 returns errors with message containing UNIQUE constraint info
        if (err.message && err.message.includes('UNIQUE constraint failed: users.username')) {
            return c.json({ error: 'El nombre de usuario ya existe' }, 400)
        }
        console.error('User creation failed', err)
        return c.json({ error: `Error interno del servidor: ${err.message}` }, 500)
    }

    return c.json({ id, name, username, role }, 201)
})

app.put('/api/users/:id', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const id = c.req.param('id')
    const { name, password, role } = await c.req.json()

    try {
        if (password) {
            const hashed = await hashPassword(password)
            await c.env.DB.prepare('UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?')
                .bind(name, hashed, role, id).run()
        } else {
            await c.env.DB.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?')
                .bind(name, role, id).run()
        }
    } catch (err: any) {
        if (err.message && err.message.includes('UNIQUE constraint failed: users.username')) {
            return c.json({ error: 'El nombre de usuario ya existe' }, 400)
        }
        console.error('User update failed', err)
        return c.json({ error: `Error interno del servidor: ${err.message}` }, 500)
    }

    return c.json({ success: true })
})

app.delete('/api/users/:id', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)
    const id = c.req.param('id')

    if (user.id === id) {
        return c.json({ error: 'No puedes bloquearte o eliminarte a ti mismo.' }, 400)
    }

    const classesCount = await c.env.DB.prepare('SELECT count(*) as total FROM classes WHERE professor_id = ?').bind(id).first()
    if (classesCount && (classesCount.total as number) > 0) {
        return c.json({ error: 'No se puede eliminar un profesor con aulas asignadas.' }, 400)
    }

    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'Usuario eliminado.' })
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
    const body = await c.req.json()
    const id = body.id || crypto.randomUUID()
    const name = body.name
    const grade = body.grade || body.grado || (body.seccion ? `${body.grado}|${body.seccion}` : null)
    const professor_id = body.professor_id || body.professorId

    if (!name || !grade || !professor_id) {
        return c.json({ error: 'Nombre, grado y profesor son requeridos' }, 400)
    }

    await c.env.DB.prepare('INSERT INTO classes (id, name, grade, professor_id) VALUES (?, ?, ?, ?)')
        .bind(id, name, grade, professor_id).run()

    return c.json({ id, name, grade, professor_id }, 201)
})

app.put('/api/classes/:id', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const id = c.req.param('id')
    const body = await c.req.json()
    const name = body.name
    const grade = body.grade || body.grado || (body.seccion ? `${body.grado}|${body.seccion}` : null)
    const professor_id = body.professor_id || body.professorId

    // allow partial updates via COALESCE
    await c.env.DB.prepare('UPDATE classes SET name = COALESCE(?, name), grade = COALESCE(?, grade), professor_id = COALESCE(?, professor_id) WHERE id = ?')
        .bind(name ?? null, grade ?? null, professor_id ?? null, id).run()
    return c.json({ success: true })
})

app.delete('/api/classes/:id', async (c) => {
    const user = c.get('user')
    if (user.role !== 'DIRECTOR') return c.json({ error: 'Prohibido' }, 403)

    const id = c.req.param('id')

    // Relying on ON DELETE CASCADE for attendance and students
    // Extra safety query array batch for SQLite D1 environments without forced PRAGMA foreign_keys
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM attendance WHERE class_id = ?').bind(id),
        c.env.DB.prepare('DELETE FROM students WHERE class_id = ?').bind(id),
        c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id)
    ])
    return c.json({ success: true, message: 'Aula y datos asociados eliminados.' })
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
    const body = await c.req.json()
    const class_id = body.class_id || body.classId
    const id = body.id || crypto.randomUUID()

    // Construct full name if sent as parts
    let name = body.name
    if (!name && body.firstName) {
        name = `${body.firstName} ${body.lastName || ''}`.trim()
    }

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(class_id).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

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

    // Relying on ON DELETE CASCADE for attendance
    // Extra safety query array batch for SQLite D1
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM attendance WHERE student_id = ?').bind(id),
        c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id)
    ])
    return c.json({ success: true, message: 'Estudiante y registros asociados eliminados.' })
})

app.get('/api/attendance', async (c) => {
    const classId = c.req.query('classId')
    const date = c.req.query('date')
    const user = c.get('user')

    // Si hay classId, aplicamos validación original
    if (classId) {
        if (user.role === 'PROFESSOR') {
            const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(classId).first()
            if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
        }

        if (date) {
            const { results } = await c.env.DB.prepare('SELECT * FROM attendance WHERE class_id = ? AND date = ?').bind(classId, date).all()
            return c.json(results)
        } else {
            const { results } = await c.env.DB.prepare('SELECT * FROM attendance WHERE class_id = ?').bind(classId).all()
            return c.json(results)
        }
    } else {
        // Optimización masiva: retornar toda la asistencia relevante (sin N+1)
        if (user.role === 'DIRECTOR') {
            const { results } = await c.env.DB.prepare('SELECT * FROM attendance').all()
            return c.json(results)
        } else {
            const { results } = await c.env.DB.prepare(`
                SELECT a.* FROM attendance a
                JOIN classes c ON a.class_id = c.id
                WHERE c.professor_id = ?
            `).bind(user.id).all()
            return c.json(results)
        }
    }
})

app.post('/api/attendance', async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const class_id = body.class_id || body.classId
    const date = body.date
    const records = (body.records || []).map((r: any) => ({
        student_id: r.student_id || r.studentId,
        status: r.status
    }))

    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(class_id).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido' }, 403)
    }

    if (!records || records.length === 0) {
        return c.json({ success: true, message: 'Sin estudiantes para registrar' })
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

    const riskQuery = `
    SELECT s.id, s.name, a.class_id, c.name as class_name,
           SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
           COUNT(*) as total
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON a.class_id = c.id
    WHERE a.date >= ? AND a.date <= ? ${classCondition}
    GROUP BY s.id
    HAVING SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) >= 10
    ORDER BY absent DESC
  `

    const { results: riskStudents } = await c.env.DB.prepare(riskQuery).bind(...bindParams).all()

    return c.json({
        aggregation: agg,
        riskStudents
    })
})

// ----- ATTENDANCE REPORTS -----
app.get('/api/reports/attendance', async (c) => {
    const user = c.get('user')
    const classId = c.req.query('classId')
    const month = c.req.query('month') // "01" - "12"
    const year = c.req.query('year') // "2024"
    const reportType = c.req.query('reportType')

    if (!classId || !month || !year) {
        return c.json({ error: 'Faltan parámetros: classId, month, year' }, 400)
    }

    // RBAC: PROFESSOR solo puede exportar sus propias aulas
    if (user.role === 'PROFESSOR') {
        const cls = await c.env.DB.prepare('SELECT professor_id FROM classes WHERE id = ?').bind(classId).first()
        if (!cls || cls.professor_id !== user.id) return c.json({ error: 'Prohibido: No tienes acceso a esta aula' }, 403)
    }

    // 1. Obtener información básica del aula
    const classInfo = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(classId).first()
    if (!classInfo) return c.json({ error: 'Aula no encontrada' }, 404)

    // 2. Obtener estudiantes del aula
    const { results: students } = await c.env.DB.prepare('SELECT id, name FROM students WHERE class_id = ? ORDER BY name ASC').bind(classId).all()

    // 3. Obtener asistencias del periodo
    const datePattern = `${year}-${month}-%`
    const { results: attendance } = await c.env.DB.prepare(`
        SELECT student_id, date, status 
        FROM attendance 
        WHERE class_id = ? AND date LIKE ?
        ORDER BY date ASC
    `).bind(classId, datePattern).all()

    // 4. Calcular estadísticas por estudiante
    const statsByStudent = students.map(s => {
        const studentAttendance = attendance.filter((a: any) => a.student_id === s.id)
        const present = studentAttendance.filter((a: any) => a.status === 'PRESENT').length
        const absent = studentAttendance.filter((a: any) => a.status === 'ABSENT').length
        const justified = studentAttendance.filter((a: any) => a.status === 'JUSTIFIED').length
        const total = studentAttendance.length
        const percent = total > 0 ? (present / total) * 100 : 0

        return {
            studentId: s.id,
            studentName: s.name,
            present,
            absent,
            justified,
            total,
            percent: Math.round(percent)
        }
    })

    // 5. Estadísticas globales del aula
    const totalStudents = students.length
    const avgAttendance = statsByStudent.length > 0
        ? statsByStudent.reduce((acc, curr) => acc + curr.percent, 0) / statsByStudent.length
        : 0
    const atRiskStudents = statsByStudent.filter(s => s.absent >= 10).length

    return c.json({
        classInfo: {
            id: classInfo.id,
            name: classInfo.name,
            grade: classInfo.grade
        },
        period: { month, year },
        reportType,
        students: statsByStudent,
        detailedAttendance: attendance,
        summary: {
            totalStudents,
            avgAttendance: Math.round(avgAttendance),
            atRiskStudents
        }
    })
})

export default app
