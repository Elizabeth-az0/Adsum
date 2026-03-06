const API_URL = process.env.API_URL || 'http://localhost:8787/api';
let token = '';
let globalInitData = null;

// Helper function to make API requests easily
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Error HTTP: ${response.status}`);
    }
    return data;
}

async function runTests() {
    console.log('===================================================');
    console.log('   INICIANDO PRUEBAS AUTOMÁTICAS BACKEND ADSUM   ');
    console.log('===================================================\n');

    // ----------------------------------------------------------------------
    // TEST 1 — Login
    // ----------------------------------------------------------------------
    process.stdout.write('TEST 1 — Login... ');
    try {
        const data = await apiRequest('/login', 'POST', { username: 'director', password: 'admin' });
        if (data.token) {
            token = data.token;
            console.log('✔ PASS');
        } else {
            throw new Error('No se recibió token de autenticación');
        }
    } catch (error) {
        console.log('✖ FAIL');
        console.error('Error completo:', error);
        process.exit(1);
    }

    // ----------------------------------------------------------------------
    // TEST 2 — Obtener estructura del sistema (/api/init)
    // ----------------------------------------------------------------------
    process.stdout.write('TEST 2 — Obtener estructura del sistema... ');
    try {
        const data = await apiRequest('/init');
        if (Array.isArray(data.classes) && Array.isArray(data.students) && Array.isArray(data.users)) {
            globalInitData = data;
            console.log('✔ PASS');
        } else {
            throw new Error('Estructura de respuesta inválida. Faltan arrays de clases, estudiantes o usuarios.');
        }
    } catch (error) {
        console.log('✖ FAIL');
        console.error('Error completo:', error);
        process.exit(1);
    }

    // ----------------------------------------------------------------------
    // PREPARACIÓN DE ENTORNO TEMPORAL PARA TEST 3, 4, 5 y 6
    // ----------------------------------------------------------------------
    let testClassId = null;
    let testStudents = [];
    try {
        const directorId = globalInitData.users.find(u => u.role === 'DIRECTOR')?.id || globalInitData.users[0].id;

        // Crear un aula temporal
        const classData = await apiRequest('/classes', 'POST', {
            name: 'Aula Test Base',
            grade: '1ro',
            professor_id: directorId
        });
        testClassId = classData.id;

        // Crear 5 estudiantes temporales
        for (let i = 1; i <= 5; i++) {
            const stData = await apiRequest('/students', 'POST', {
                name: `Estudiante Base ${i}`,
                class_id: testClassId
            });
            testStudents.push(stData);
        }
    } catch (error) {
        console.error('\nError en preparación de entorno para Test 3:', error);
        process.exit(1);
    }

    const currentDate = new Date().toISOString().split('T')[0];

    // ----------------------------------------------------------------------
    // TEST 3 — Guardar asistencia
    // ----------------------------------------------------------------------
    process.stdout.write('TEST 3 — Guardar asistencia... ');
    let attendancePayload = {
        class_id: testClassId,
        date: currentDate,
        records: testStudents.map((st, i) => ({
            student_id: st.id,
            status: i % 2 === 0 ? 'PRESENT' : 'ABSENT' // Combinación de presentes y ausentes
        }))
    };

    try {
        const data = await apiRequest('/attendance', 'POST', attendancePayload);
        if (data.success) {
            console.log('✔ PASS');
        } else {
            throw new Error('La respuesta indicó que success fue false: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.log('✖ FAIL');
        console.error('Error completo:', error);
    }

    // ----------------------------------------------------------------------
    // TEST 4 — Verificar persistencia
    // ----------------------------------------------------------------------
    process.stdout.write('TEST 4 — Verificar persistencia... ');
    try {
        const data = await apiRequest(`/attendance?classId=${testClassId}&date=${currentDate}`);
        if (Array.isArray(data) && data.length === testStudents.length) {
            console.log('✔ PASS');
        } else {
            throw new Error(`Se esperaban ${testStudents.length} registros persistidos pero se obtuvieron ${data.length}`);
        }
    } catch (error) {
        console.log('✖ FAIL');
        console.error('Error completo:', error);
    }

    // ----------------------------------------------------------------------
    // TEST 5 — Evitar duplicados
    // ----------------------------------------------------------------------
    process.stdout.write('TEST 5 — Evitar duplicados (UNIQUE constraint)... ');
    try {
        // Volvemos a enviar la misma asistencia
        await apiRequest('/attendance', 'POST', attendancePayload);

        // Consultamos y verificamos que no hay el doble de registros
        const postData = await apiRequest(`/attendance?classId=${testClassId}&date=${currentDate}`);
        if (Array.isArray(postData) && postData.length === testStudents.length) {
            console.log('✔ PASS');
        } else {
            throw new Error(`Se crearon duplicados, hay un total de ${postData.length} registros ahora.`);
        }
    } catch (error) {
        console.log('✖ FAIL');
        console.error('Error completo:', error);
    }

    // ----------------------------------------------------------------------
    // TEST 6 — Prueba de carga moderada
    // ----------------------------------------------------------------------
    process.stdout.write('TEST 6 — Prueba de carga moderada (30 estudiantes en 1 sola request x 3 clases)... ');
    try {
        const directorId = globalInitData.users.find(u => u.role === 'DIRECTOR')?.id || globalInitData.users[0].id;

        for (let c = 1; c <= 3; c++) {
            // Crear clase
            const loadClass = await apiRequest('/classes', 'POST', {
                name: `Aula Carga Mod ${c}`,
                grade: '2do',
                professor_id: directorId
            });

            // Preparar records ficticios (estudiantes y asistencias directamente)
            // Para ir más rápido y probar la carga a la BD, generamos alumnos
            let studentsList = [];
            for (let s = 1; s <= 30; s++) {
                const est = await apiRequest('/students', 'POST', {
                    name: `Estudiante Carga ${c}-${s}`,
                    class_id: loadClass.id
                });
                studentsList.push(est);
            }

            // Enviar 30 asistencias en una sola solicitud
            const loadAttendancePayload = {
                class_id: loadClass.id,
                date: currentDate,
                records: studentsList.map(st => ({
                    student_id: st.id,
                    status: 'PRESENT'
                }))
            };

            const res = await apiRequest('/attendance', 'POST', loadAttendancePayload);
            if (!res.success) throw new Error(`Fallo guardando asistencia de clase #${c}`);
        }

        console.log('✔ PASS');
    } catch (error) {
        console.log('✖ FAIL');
        console.error('Error completo:', error);
    }

    // ----------------------------------------------------------------------
    // TEST 7 — Simulación de escuela rural
    // ----------------------------------------------------------------------
    // Parámetros fácilmente modificables
    const RURAL_CLASSROOMS = 20;
    const RURAL_STUDENTS_PER_CLASS = 25;
    const RURAL_DATE = currentDate;

    process.stdout.write(`TEST 7 — Simulación de escuela rural (${RURAL_CLASSROOMS} aulas, ${RURAL_STUDENTS_PER_CLASS} estudiantes/aula)... `);
    try {
        const directorId = globalInitData.users.find(u => u.role === 'DIRECTOR')?.id || globalInitData.users[0].id;
        let ruralClassIds = [];

        // Crear las 20 aulas y sus 25 estudiantes en paralelo para ser más agresivos pero ordenados
        for (let c = 1; c <= RURAL_CLASSROOMS; c++) {
            const ruralClass = await apiRequest('/classes', 'POST', {
                name: `Escuela Rural Aula ${c}`,
                grade: 'Rural',
                professor_id: directorId
            });
            ruralClassIds.push(ruralClass.id);

            // Crear estudiantes
            const studentPromises = [];
            for (let s = 1; s <= RURAL_STUDENTS_PER_CLASS; s++) {
                studentPromises.push(apiRequest('/students', 'POST', {
                    name: `Rural Alumno ${c}-${s}`,
                    class_id: ruralClass.id
                }));
            }
            // Await en bloques para no ahogar sqlite D1 si es un worker muy básico
            await Promise.all(studentPromises);
        }

        // Ahora guardar la asistencia para todas las aulas creadas
        // Podemos hacerlo aula por aula (similar a la vida real cuando cada profe sube la asistencia) o de una
        const attendancePromises = [];
        for (const rId of ruralClassIds) {
            // Necesitamos los estudiantes para asignar los records
            const studentsOfClass = await apiRequest(`/students/${rId}`);

            const attPayload = {
                class_id: rId,
                date: RURAL_DATE,
                records: studentsOfClass.map(st => ({
                    student_id: st.id,
                    status: Math.random() > 0.1 ? 'PRESENT' : 'ABSENT' // 90% asistencia
                }))
            };

            attendancePromises.push(apiRequest('/attendance', 'POST', attPayload));
        }

        await Promise.all(attendancePromises);

        console.log('✔ PASS');

    } catch (error) {
        console.log('✖ FAIL');
        console.error('Error completo:', error);
    }

    // ----------------------------------------------------------------------
    // TEST 8 — Verificar manejo de usuario duplicado
    // ----------------------------------------------------------------------
    process.stdout.write('TEST 8 — Usuario duplicado... ');
    try {
        const duplicate = await apiRequest('/users', 'POST', {
            name: 'Usuario Duplicado',
            username: 'director', // ya existe
            password: 'pass123',
            role: 'PROFESSOR'
        });
        console.log('✖ FAIL (debería rechazarse)');
    } catch (error) {
        if (error.message && error.message.includes('nombre de usuario')) {
            console.log('✔ PASS');
        } else {
            console.log('✖ FAIL');
            console.error('Error inesperado:', error);
        }
    }

    console.log('\n===================================================');
    console.log('   PRUEBAS AUTOMÁTICAS FINALIZADAS   ');
    console.log('===================================================');
}

runTests();
