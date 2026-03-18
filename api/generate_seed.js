const fs = require('fs');
const crypto = require('crypto');

const today = new Date();
const currentMonth = today.getMonth(); 
const currentYear = today.getFullYear();

function getUUID() {
    return crypto.randomUUID();
}

function getRandomStatus() {
    const rand = Math.random();
    if (rand < 0.8) return 'PRESENT';
    if (rand < 0.95) return 'ABSENT';
    return 'JUSTIFIED';
}

const firstNames = ['María', 'José', 'Juan', 'Luis', 'Carlos', 'Ana', 'Laura', 'Pedro', 'Miguel', 'Lucía', 'Sofía', 'Daniel', 'Marta', 'Alejandro', 'Andrés', 'David', 'Carmen', 'Elena', 'Pablo', 'Diego'];
const lastNames = ['García', 'Fernández', 'López', 'Martínez', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Gómez', 'Flores', 'Morales', 'Vargas', 'Reyes', 'Rojas', 'Ruiz', 'Alonso', 'Castillo', 'Jiménez'];

function getRandomName() {
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

const inserts = [];

const prof1Id = getUUID();
const prof2Id = getUUID();

const passwordHash = crypto.createHash('sha256').update('123456').digest('hex'); 
const demoDirectorHash = crypto.createHash('sha256').update('password').digest('hex');

inserts.push(`INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES ('${prof1Id}', 'Profesor de ejemplo 1', 'profesor1', '${passwordHash}', 'PROFESSOR');`);
inserts.push(`INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES ('${prof2Id}', 'Profesor de ejemplo 2', 'profesor2', '${passwordHash}', 'PROFESSOR');`);

const classes = [
    { id: getUUID(), name: 'Aula de ejemplo 1', grade: '1ro|A', professor_id: prof1Id },
    { id: getUUID(), name: 'Aula de ejemplo 2', grade: '2do|A', professor_id: prof2Id },
    { id: getUUID(), name: 'Aula de ejemplo 3', grade: '3ro|B', professor_id: prof1Id }
];

for (const cls of classes) {
    inserts.push(`INSERT OR IGNORE INTO classes (id, name, grade, professor_id) VALUES ('${cls.id}', '${cls.name}', '${cls.grade}', '${cls.professor_id}');`);

    const students = [];
    for (let i = 0; i < 12; i++) {
        const sid = getUUID();
        students.push(sid);
        inserts.push(`INSERT OR IGNORE INTO students (id, name, class_id) VALUES ('${sid}', '${getRandomName().replace("'", "''")}', '${cls.id}');`);
    }

    for (let d = 1; d <= today.getDate(); d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;

        const dateStr = dateObj.toISOString().split('T')[0];

        for (const sid of students) {
            const attId = getUUID();
            const status = getRandomStatus();
            inserts.push(`INSERT OR IGNORE INTO attendance (id, student_id, class_id, date, status) VALUES ('${attId}', '${sid}', '${cls.id}', '${dateStr}', '${status}');`);
        }
    }
}

fs.writeFileSync('seed_demo.sql', inserts.join('\n'));
console.log('generated seed_demo.sql successfully!');
