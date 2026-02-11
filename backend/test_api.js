require('dotenv').config();
const axios = require('axios');

async function testAPI() {
    try {
        // 1. Login
        console.log('=== TESTING LOGIN ===');
        const loginResponse = await axios.post('http://localhost:3000/api/login', {
            username: 'admin',
            password: 'admin123'
        });

        console.log('Login successful!');
        console.log('User:', JSON.stringify(loginResponse.data.user, null, 2));

        const token = loginResponse.data.token;

        // 2. Get Projects
        console.log('\n=== TESTING GET /api/projects ===');
        const projectsResponse = await axios.get('http://localhost:3000/api/projects', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Projects fetched successfully!');
        console.log('Number of projects:', projectsResponse.data.length);
        console.log('Projects:', JSON.stringify(projectsResponse.data, null, 2));

    } catch (error) {
        console.error('ERROR:', error.response?.data || error.message);
    }
}

testAPI();
