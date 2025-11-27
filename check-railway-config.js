require('dotenv').config();

console.log('\n=== Railway Configuration Check ===\n');

console.log('Environment Variables Found:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('BASE_URL:', process.env.BASE_URL || 'not set');

console.log('\n--- MongoDB Configuration ---');
const mongoVars = [
  'MONGO_PUBLIC_URL',
  'MONGO_URL', 
  'MONGO_URI',
  'MONGOHOST',
  'MONGO_HOST'
];

let mongoFound = false;
mongoVars.forEach(varName => {
  if (process.env[varName]) {
    const value = process.env[varName];
    const masked = value.replace(/:[^:@]+@/, ':****@');
    console.log(`${varName}:`, masked);
    
    if (value.includes('.railway.internal')) {
      console.log('  ⚠️  WARNING: Using internal hostname - this may not work!');
      console.log('  💡 Use MONGO_PUBLIC_URL with .proxy.rlwy.net instead');
    } else if (value.includes('.proxy.rlwy.net')) {
      console.log('  ✅ Using public proxy URL - good!');
    } else if (value.includes('localhost') || value.includes('127.0.0.1')) {
      console.log('  ℹ️  Using localhost - only works for local development');
    }
    mongoFound = true;
  }
});

if (!mongoFound) {
  console.log('❌ No MongoDB connection string found!');
  console.log('💡 Set MONGO_PUBLIC_URL or MONGO_URI');
}

console.log('\n--- Redis Configuration ---');
const redisVars = [
  'REDIS_PUBLIC_URL',
  'REDIS_URL',
  'REDIS_HOST',
  'REDISHOST'
];

let redisFound = false;
redisVars.forEach(varName => {
  if (process.env[varName]) {
    const value = process.env[varName];
    let masked = value;
    if (value.includes('@')) {
      masked = value.replace(/:[^:@]+@/, ':****@');
    }
    console.log(`${varName}:`, masked);
    
    if (value.includes('.railway.internal')) {
      console.log('  ⚠️  WARNING: Using internal hostname - this may not work!');
      console.log('  💡 Use REDIS_PUBLIC_URL with .proxy.rlwy.net instead');
    } else if (value.includes('.proxy.rlwy.net')) {
      console.log('  ✅ Using public proxy URL - good!');
    } else if (value.includes('localhost') || value.includes('127.0.0.1')) {
      console.log('  ℹ️  Using localhost - only works for local development');
    }
    redisFound = true;
  }
});

if (!redisFound) {
  console.log('ℹ️  No Redis configuration found - will use memory store');
}

console.log('\n--- Recommendations ---');

const issues = [];
if (!mongoFound) {
  issues.push('Set MONGO_PUBLIC_URL or MONGO_URI');
}
if (process.env.MONGO_URI && process.env.MONGO_URI.includes('.railway.internal')) {
  issues.push('Replace MONGO_URI with public URL (.proxy.rlwy.net)');
}
if (process.env.REDIS_URL && process.env.REDIS_URL.includes('.railway.internal')) {
  issues.push('Replace REDIS_URL with REDIS_PUBLIC_URL (.proxy.rlwy.net)');
}
if (!process.env.BASE_URL) {
  issues.push('Set BASE_URL to your Railway app URL');
}

if (issues.length > 0) {
  console.log('❌ Issues found:');
  issues.forEach(issue => console.log(`   - ${issue}`));
} else {
  console.log('✅ Configuration looks good!');
}

console.log('\n=== End of Configuration Check ===\n');