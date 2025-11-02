# Troubleshooting Guide

## Common Issues and Solutions

### Server Not Responding / High CPU Usage

If the development server becomes unresponsive or shows high CPU usage:

**Quick Fix:**
```bash
npm run dev:clean
```

This will kill any hung processes on port 3000 and restart the server fresh.

**Manual Fix:**
```bash
# Kill the hung process
npm run kill

# Or manually:
lsof -ti:3000 | xargs kill -9

# Then restart
npm run dev
```

### Prevention Tips

1. **Regular Restarts**: Don't leave the dev server running for days
   - Restart it at least once a day during active development
   - Always restart after major changes

2. **Monitor CPU Usage**: If you notice high CPU usage in Activity Monitor:
   - Look for `next-server` or `node` processes
   - If CPU is consistently >50%, restart the server

3. **Clean Development Workflow**:
   ```bash
   # Start fresh each session
   npm run dev:clean
   ```

4. **Database Connection Issues**: If using SQLite (like this app):
   - Close the server properly (Ctrl+C) instead of force-killing
   - This ensures database connections close gracefully

5. **File Watcher Issues**: 
   - If hot reload stops working, restart the server
   - Clear `.next` directory if issues persist: `rm -rf .next`

### Multiple Lockfile Warning

The warning about multiple lockfiles has been resolved by:
- Adding explicit `turbo.root` configuration in `next.config.ts`
- This tells Next.js to use the correct project directory

**The lockfile in `/Users/burman/` is from shadcn CLI**. You have two options:

**Option 1 (Recommended)**: Keep it but ignore the warning
- The Next.js config now explicitly sets the project root
- The warning should disappear on next restart

**Option 2**: Remove the home directory package files
```bash
# Only if you're not actively using shadcn CLI from your home directory
rm /Users/burman/package.json
rm /Users/burman/package-lock.json
```

## Health Check Commands

```bash
# Check if server is running
lsof -i :3000

# Check process CPU usage
ps aux | grep next

# Test if server responds
curl -I http://localhost:3000
```

## When to Restart

Restart the dev server if you experience:
- ❌ Pages not loading or timing out
- ❌ Hot reload not working
- ❌ CPU usage >50% consistently
- ❌ Changes not reflecting in the browser
- ❌ Database errors that persist
- ❌ TypeScript errors that won't clear

## Emergency Reset

If nothing else works:
```bash
# Kill all node processes (use with caution!)
killall node

# Clean Next.js cache
rm -rf .next

# Reinstall dependencies (rarely needed)
rm -rf node_modules package-lock.json
npm install

# Restart fresh
npm run dev:clean
```

