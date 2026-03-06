# 🪟 Windows Setup - Quick Reference

## 📦 What You Need

1. **Git for Windows** - https://git-scm.com/download/win
2. **Laragon** - https://laragon.org/download/
3. **k6 (optional)** - https://k6.io/docs/getting-started/installation/#windows

---

## ⚡ 10 Minutes Setup

### **A. Clone Repository**

```cmd
cd C:\laragon\www
git clone git@github.com:Putraa70/Computer-Based-Test-2.0.git cbt
cd cbt
```

### **B. Run Setup Script**

**Option 1: Batch Script (CMD)**

```cmd
setup-windows.bat
```

**Option 2: PowerShell**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-windows.ps1
```

**Option 3: Manual Setup** (jika scripts gagal)

```cmd
copy .env.windows.example .env
php artisan key:generate
composer install
php artisan migrate
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### **C. Start Laragon Services**

```
Laragon Menu → Services → Toggle ALL ON
✓ Nginx, MySQL, PHP, Redis (semua harus HIJAU)
```

### **D. Verify**

```
Browser: http://localhost
Database: http://localhost/adminer  (root / password kosong)
```

---

## 🧪 Load Testing

### **Run k6 Test**

**Option 1: Batch Script**

```cmd
run-test.bat warm      (50 users)
run-test.bat light     (100 users)
run-test.bat medium    (150 users)
run-test.bat heavy     (500 users)
```

**Option 2: PowerShell**

```powershell
.\run-test.ps1 warm
.\run-test.ps1 light
.\run-test.ps1 medium
.\run-test.ps1 heavy
```

**Option 3: Manual k6**

```cmd
k6 run load-test/full-exam-flow.js
```

---

## 📁 Important Files for Windows

| File                       | Purpose                            |
| -------------------------- | ---------------------------------- |
| `WINDOWS_LARAGON_SETUP.md` | Full setup guide (troubleshooting) |
| `.env.windows.example`     | Environment template for Windows   |
| `setup-windows.bat`        | Automated setup (Batch)            |
| `setup-windows.ps1`        | Automated setup (PowerShell)       |
| `run-test.bat`             | k6 test runner (Batch)             |
| `run-test.ps1`             | k6 test runner (PowerShell)        |

---

## ⚠️ Common Issues

| Issue                  | Solution                                                        |
| ---------------------- | --------------------------------------------------------------- |
| MySQL not running      | Laragon → Services → Toggle MySQL ON                            |
| Redis not running      | Laragon → Services → Toggle Redis ON                            |
| Port 80 already in use | `netstat -ano \| findstr :80` then `taskkill /PID xxx /F`       |
| PHP command not found  | Use Laragon Terminal instead of CMD                             |
| k6 not found           | Install: `npm install -g k6` or download from k6.io             |
| Database error         | Run: `mysql -u root -e "CREATE DATABASE IF NOT EXISTS cbt_db;"` |

---

## 🎯 Next: Deploy to Server

Once everything works in Windows/Laragon:

1. **Deploy to actual server** (Linux + Ubuntu recommended)
    - Use `DEPLOY_PRODUCTION.sh` for automation
    - See `PRODUCTION_TEST_GUIDE.md`

2. **Or keep on Windows server** (if must)
    - Setup Laragon on server
    - Adjust PHP workers (less than Linux)
    - Monitor RAM usage (8GB recommended minimum)

---

## 💡 Performance Notes

- **Windows Laragon:** Expect 20-30% slower than Linux
- **Local k6 test p90:** ~100-200ms (development machine)
- **Production p90 target:** <500ms for 150 concurrent users
- **RAM:** 8GB minimum comfortable, 16GB recommended

---

## 🚀 All Commands Summary

```cmd
REM Setup
setup-windows.bat

REM Or manual
copy .env.windows.example .env
php artisan key:generate
composer install
php artisan migrate
php artisan config:cache

REM Testing
run-test.bat warm
run-test.bat medium
run-test.bat heavy

REM Manual commands
php artisan tinker
php artisan route:list
php artisan cache:clear
```

---

## 📞 Files in This Repository for Windows

```
Computer-Based-Test/
├── WINDOWS_LARAGON_SETUP.md      ← Full detailed guide
├── .env.windows.example            ← Template for .env
├── setup-windows.bat               ← Quick setup (Batch)
├── setup-windows.ps1               ← Quick setup (PowerShell)
├── run-test.bat                    ← k6 test runner (Batch)
├── run-test.ps1                    ← k6 test runner (PowerShell)
├── PRODUCTION_TEST_GUIDE.md        ← Deployment reference
├── PRODUCTION_READY_SIGN_OFF.md    ← Test results & sign-off
└── load-test/
    └── full-exam-flow.js           ← k6 test script (DO NOT MODIFY)
```

---

**Questions?** Check `WINDOWS_LARAGON_SETUP.md` for troubleshooting section.
