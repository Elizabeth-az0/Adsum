async function run() {
    try {
        const loginRes = await fetch('https://adsum-api.elizabethgaldames35.workers.dev/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'director', password: 'admin' })
        });
        const loginData = await loginRes.json();
        console.log("Login token exists: ", !!loginData.token);

        if (!loginData.token) return;

        // Get users to pick a professor_id
        const usersRes = await fetch('https://adsum-api.elizabethgaldames35.workers.dev/api/users', {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const users = await usersRes.json();
        const professor = users.find(u => u.role === 'PROFESSOR');
        const professorId = professor ? professor.id : '';

        console.log("Professor:", professorId);

        if (!professorId) return;

        const classRes = await fetch('https://adsum-api.elizabethgaldames35.workers.dev/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify({
                name: 'Test Class',
                grade: '1ro Secundaria|A',
                professor_id: professorId
            })
        });

        const classText = await classRes.text();
        console.log("Create Class Status:", classRes.status);
        console.log("Create Class Response:", classText);

    } catch (e) {
        console.error(e);
    }
}
run();
