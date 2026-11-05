1. فایل backend/app/api/student_import.py را در app/api/ کپی کنید.
2. در app/main.py:
   from app.api.student_import import router as student_import_router
   app.include_router(student_import_router)      # بعد از driver_self_router
3. بازراه‌اندازی. (تست‌شده روی SQLite: پیش‌نمایش، ثبت، ورود دانشجوی جدید، رد تکراری، 403 برای راننده)
git: git add app/api/student_import.py app/main.py && git commit -m "Add student bulk import" && git push
