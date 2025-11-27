# Railway Deployment - CRITICAL FIX

## The Problem
Railway's internal hostnames (`.railway.internal`) are not resolving. You need to use PUBLIC URLs instead.

## IMMEDIATE FIX - Update Railway Variables

### Step 1: Fix MongoDB Connection
In your Railway app service, REPLACE the current MongoDB variable:

**DELETE:**
```
MONGO_URI=mongodb://mongo:password@mongodb.railway.internal:27017
```

**ADD ONE OF THESE (in order of preference):**

Option 1: Reference MongoDB service (Best)
```
Variable Name: MONGO_PUBLIC_URL
Variable Value: ${{MongoDB.MONGO_PUBLIC_URL}}
```

Option 2: Use the public connection string
```
Variable Name: MONGO_PUBLIC_URL
Variable Value: mongodb://mongo:kpOhHEUwZQpXqPhQuo1eQHMmQPyvPEUb@mainline.proxy.rlwy.net:43852
```

Option 3: Keep MONGO_URI but use public URL
```
Variable Name: MONGO_URI  
Variable Value: mongodb://mongo:kpOhHEUwZQpXqPhQuo1eQHMmQPyvPEUb@mainline.proxy.rlwy.net:43852
```

### Step 2: Fix Redis Connection (Optional)

**DELETE ALL THESE:**
```
REDIS_URL
REDIS_HOST (redis.railway.internal)
REDISHOST
REDISPORT
REDISPASSWORD
```

**ADD (if you want Redis):**
```
Variable Name: REDIS_PUBLIC_URL
Variable Value: ${{Redis.REDIS_PUBLIC_URL}}
```

**OR** use the direct public URL:
```
Variable Name: REDIS_PUBLIC_URL
Variable Value: redis://default:password@shuttle.proxy.rlwy.net:31506
```

**OR** skip Redis entirely (app works fine without it)

### Step 3: Verify Required Variables
Make sure you have these set:
```
BASE_URL=https://url-shortner-production-4e08.up.railway.app
NODE_ENV=production
PORT=3000
```

### Step 4: Redeploy
After updating variables, click "Deploy" or push a change to trigger redeployment.

---

## Why This Happened

Railway provides TWO types of connection strings:
1. **Private/Internal** - `*.railway.internal` - Only works between services in same project
2. **Public** - `*.proxy.rlwy.net` - Works from anywhere, including your app

Your variables were set to use internal hostnames, which aren't resolving properly.

---

## Quick Reference - Railway Variable Names

Railway services expose these variable names automatically:

### MongoDB Service
- `${{MongoDB.MONGO_PUBLIC_URL}}` - Use this
- `${{MongoDB.MONGO_PRIVATE_URL}}` - Don't use (internal only)

### Redis Service  
- `${{Redis.REDIS_PUBLIC_URL}}` - Use this
- `${{Redis.REDIS_PRIVATE_URL}}` - Don't use (internal only)

---

## Example Working Configuration

Here's what your Railway variables should look like:

```
MONGO_PUBLIC_URL=${{MongoDB.MONGO_PUBLIC_URL}}
BASE_URL=https://url-shortner-production-4e08.up.railway.app
NODE_ENV=production
PORT=3000
```

Optional (only if you want Redis):
```
REDIS_PUBLIC_URL=${{Redis.REDIS_PUBLIC_URL}}
```

---

## Alternative: Use Direct URLs

If variable references don't work, use the direct public URLs from your Railway dashboard:

### From Your Screenshots:

MongoDB:
```
MONGO_URI=mongodb://mongo:kpOhHEUwZQpXqPhQuo1eQHMmQPyvPEUb@mainline.proxy.rlwy.net:43852
```

Redis:
```
REDIS_PUBLIC_URL=redis://default:HjDjdfeQnEeauxjHAFLWvtTMovFzBr11@shuttle.proxy.rlwy.net:31506
```

---

## Verifying the Fix

After redeploying, check logs for:

GOOD - Success messages:
```
Attempting to connect to MongoDB...
Connected to MongoDB successfully
Server running on port 3000
```

BAD - Still failing:
```
MongoDB connection error: getaddrinfo ENOTFOUND
```

If still failing:
1. Double-check you used the PUBLIC URL (*.proxy.rlwy.net)
2. Make sure there are no typos in the connection string
3. Verify the password matches what's in your MongoDB service
4. Try using the direct URL instead of variable reference

---

## Testing After Deployment

1. Check health endpoint:
```
https://url-shortner-production-4e08.up.railway.app/health
```

Should return:
```json
{
  "status": "OK",
  "mongodb": "Connected"
}
```

2. Test creating a short URL:
```
https://url-shortner-production-4e08.up.railway.app/
```

---

## Common Mistakes

❌ WRONG - Using internal hostname:
```
MONGO_URI=mongodb://user:pass@mongodb.railway.internal:27017
```

✅ CORRECT - Using public proxy:
```
MONGO_URI=mongodb://user:pass@mainline.proxy.rlwy.net:43852
```

❌ WRONG - Referencing private URL:
```
MONGO_URI=${{MongoDB.MONGO_PRIVATE_URL}}
```

✅ CORRECT - Referencing public URL:
```
MONGO_PUBLIC_URL=${{MongoDB.MONGO_PUBLIC_URL}}
```

---

## If Nothing Works

Last resort - Manual connection strings:

1. Go to your MongoDB service in Railway
2. Find "Variables" tab
3. Copy the value of `MONGO_PUBLIC_URL` 
4. Paste it directly as `MONGO_URI` in your app service
5. Do the same for Redis if needed

The connection string should look like:
```
mongodb://username:password@XXXXX.proxy.rlwy.net:PORT
```

NOT like:
```
mongodb://username:password@XXXXX.railway.internal:PORT
```