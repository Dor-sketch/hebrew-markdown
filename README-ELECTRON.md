# Hebrew Markdown - אפליקציית Electron (Portable)

מדריך ליצירת אפליקציית דסקטופ מהריפוזיטורי הזה באמצעות Electron.

## דרישות מקדימות

1. **Node.js** (גרסה 18 ומעלה) - [הורדה מכאן](https://nodejs.org/)
2. **Git** - [הורדה מכאן](https://git-scm.com/downloads)

כדי לוודא שהכלים מותקנים, הריצו בטרמינל:

```bash
node --version
npm --version
git --version
```

## שלב 1: הורדת הריפוזיטורי

```bash
git clone https://github.com/dorpascal/hebrew-markdown.git
cd hebrew-markdown
```

## שלב 2: התקנת תלויות

```bash
npm install
```

פקודה זו תתקין רק שתי חבילות:
- `electron` - הפריימוורק להרצת אפליקציות דסקטופ
- `electron-builder` - כלי לאריזת האפליקציה כקובץ portable

## שלב 3: הרצה במצב פיתוח

לבדיקה מקומית לפני אריזה:

```bash
npm start
```

האפליקציה תיפתח בחלון דסקטופ עם תפריט עברי מלא.

## שלב 4: בניית אפליקציה Portable

### Windows (קובץ EXE נייד)

```bash
npm run pack:win
```

התוצאה: קובץ `HebrewMarkdown-Portable.exe` בתיקיית `dist/`.
ניתן להעתיק את הקובץ לכל מקום ולהריץ ללא התקנה.

### Linux (AppImage)

```bash
npm run pack:linux
```

התוצאה: קובץ `AppImage` בתיקיית `dist/`.
יש לתת הרשאות הרצה:

```bash
chmod +x dist/Hebrew*.AppImage
./dist/Hebrew*.AppImage
```

### macOS (DMG)

```bash
npm run pack:mac
```

התוצאה: קובץ `DMG` בתיקיית `dist/`.

## מבנה הקבצים של Electron

```
hebrew-markdown/
├── package.json          # הגדרות הפרויקט וסקריפטי בנייה
├── electron/
│   ├── main.js           # תהליך ראשי - חלון, תפריטים, דיאלוגים
│   └── preload.js        # גשר מאובטח בין Node.js לדפדפן
├── index.html            # האפליקציה עצמה (ללא שינוי)
├── styles.css            # עיצוב (ללא שינוי)
└── images/               # אייקונים ותמונות
```

## פיצ'רים באפליקציית הדסקטופ

### פעולות קבצים מלאות
- **פתיחת קובץ** (Ctrl+O) - דיאלוג מערכת מקורי לפתיחת קבצי Markdown
- **שמירת קובץ** (Ctrl+S) - שמירה ישירה לנתיב הנוכחי
- **שמירה בשם** (Ctrl+Shift+S) - דיאלוג שמירה עם בחירת מיקום ושם
- שמות קבצים מוצגים בשורת המצב ובכותרת החלון

### תפריט מותאם בעברית
- תפריט קובץ: פתיחה, שמירה, שמירה בשם, יציאה
- תפריט עריכה: ביטול, גזירה, העתקה, הדבקה
- תפריט תצוגה: זום, מסך מלא

### תאימות פלטפורמה
- **Windows**: פעולות קבצים מלאות עם דיאלוגים של Windows Explorer
- **Linux**: דיאלוגים מקוריים של GTK/KDE
- **macOS**: דיאלוגים מקוריים של Finder

## הערות חשובות

### אודות אפליקציה Portable
- הקובץ הסופי עצמאי לחלוטין - אין צורך בהתקנת Node.js או Electron בנפרד
- ניתן להריץ ישירות מ-USB או מתיקייה כלשהי
- אין רישום ב-Registry של Windows ואין צורך בהרשאות מנהל

### אודות גרסת דפדפן
- אותו קובץ `index.html` עובד גם בדפדפן וגם ב-Electron
- בדפדפן, הפעולות מתבצעות דרך File System Access API (Chrome/Edge) או העלאת קבצים
- ב-Electron, הפעולות מתבצעות דרך דיאלוגים מקוריים של מערכת ההפעלה

### פתרון בעיות

**הפקודה `npm start` נכשלת:**
ודאו ש-Node.js מותקן (גרסה 18+) והריצו `npm install` מחדש.

**הבנייה נכשלת ב-Windows:**
ודאו שיש לכם הרשאות כתיבה לתיקיית `dist/`. ב-Windows Defender, ייתכן שצריך לאשר את הקובץ שנוצר.

**הבנייה נכשלת ב-Linux:**
ייתכן שצריך להתקין חבילות מערכת נוספות:
```bash
sudo apt-get install dpkg fakeroot
```
