# 🔧 PostgreSQL Database Setup Instructions

## Required Steps:

### 1. Check Your PostgreSQL Connection in pgAdmin4
- Open pgAdmin4
- Note your server connection details:
  - **Username** (usually 'postgres')
  - **Password** (the one you set during installation)
  - **Host** (usually 'localhost')
  - **Port** (usually 5432)

### 2. Update Database URL
Edit the `.env` file and update the DATABASE_URL with your actual credentials:

```
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/blockfreelancer?schema=public"
```

Example:
```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/blockfreelancer?schema=public"
```

### 3. Create Database (Optional)
You can either:
- Let Prisma create the database automatically, OR
- Create it manually in pgAdmin4:
  1. Right-click "Databases" → "Create" → "Database"
  2. Name: `blockfreelancer`
  3. Click "Save"

### 4. Run Migration
Once credentials are correct, run:
```bash
npx prisma migrate dev --name init
```

### 5. Generate Prisma Client
```bash
npx prisma generate
```

## Common PostgreSQL Default Credentials:
- Username: `postgres`
- Password: `admin`, `password`, `postgres`, or the one you set during installation
- Host: `localhost`
- Port: `5432`

## If You Don't Remember Your Password:
You may need to reset your PostgreSQL password or check your saved credentials in pgAdmin4.
