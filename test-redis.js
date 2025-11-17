// test-redis.js

require('dotenv').config();
const { getCache, setCache, deleteCache } = require('./src/services/cacheService');

async function testRedis() {
  console.log('🧪 Testing Redis Connection...\n');

  try {
    console.log('1️⃣ Testing SET...');
    await setCache('test:hello', { message: 'Hello Redis!' }, 60);
    console.log('✅ SET successful\n');

    console.log('2️⃣ Testing GET...');
    const data = await getCache('test:hello');
    console.log('✅ GET successful:', data, '\n');

    console.log('3️⃣ Testing DELETE...');
    await deleteCache('test:hello');
    console.log('✅ DELETE successful\n');

    console.log('4️⃣ Verifying deletion...');
    const deletedData = await getCache('test:hello');
    console.log('✅ Verified (should be null):', deletedData, '\n');

    console.log('🎉 All Redis tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();