
async function testAPI() {
    try {
        console.log('=== TESTING LOGIN ===');
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginData = await loginResponse.json();
        console.log('Login successful!', loginData.user);
        const token = loginData.token;

        console.log('\n=== TESTING GET /api/projects ===');
        const projectsResponse = await fetch('http://localhost:3000/api/projects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!projectsResponse.ok) {
            throw new Error(`Get Projects failed: ${projectsResponse.status} ${projectsResponse.statusText}`);
        }

        const projectsData = await projectsResponse.json();
        console.log('Projects fetched successfully!');
        console.log('Number of projects:', projectsData.length);
        if (projectsData.length > 0) {
            console.log('First Project:', projectsData[0]);
        }

    } catch (error) {
        console.error('TEST FAILED:', error.message);
    }
}

testAPI();
