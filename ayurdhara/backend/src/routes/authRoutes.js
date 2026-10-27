
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const router = express.Router();

// Patient registration
router.post("/register", async (req, res) => {
  console.log("BODY:", req.body);
  return res.status(400).json({
  message: "DOCTOR ROUTE VALIDATION REACHED",
  receivedFields: Object.keys(req.body || {})
});
  const { name, email, password } = req.body;
  
  if (
  !name ||
  !email ||
  !password ||
  !degree ||
  !specialization ||
  !license_number
) {
  return res.status(400).json({
    message: "DOCTOR VALIDATION CHECK",
    receivedFields: Object.keys(req.body || {})
  });
}


  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters"
    });
  }
console.log("Doctor registration body:", req.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await client.query(
      "SELECT user_id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash, "patient"]
    );

    const user = userResult.rows[0];

    await client.query(
      "INSERT INTO patients (user_id) VALUES ($1)",
      [user.user_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Patient registered successfully",
      user
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed"
    });
  } finally {
    client.release();
  }
});

router.post("/register-doctor", async (req, res) => {
 const {
  name,
  email,
  password,
  degree,
  date_of_birth,
  specialization,
  license_number,
  phone
} = req.body || {};
console.log("Received body:", req.body);
console.log("Required fields:", {
  name,
  email,
  password: !!password,
  degree,
  specialization,
  license_number
});

  if (!name || !email || !password || !degree ||
      !specialization || !license_number) {
    return res.status(400).json({
      message: "Name, email, password, degree, specialization, and license number are required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters"
    });
  }
  

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await client.query(
      "SELECT user_id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, created_at`,
      [name.trim(), normalizedEmail, passwordHash, "doctor"]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO doctors
       (user_id, degree, date_of_birth, specialization,
        license_number, phone)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.user_id,
        degree,
        date_of_birth || null,
        specialization,
        license_number,
        phone || null
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Doctor registered successfully. Admin approval is required before access is granted.",
      user
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email or license number already exists"
      });
    }

    if (error.code === "23514" || error.code === "22P02" ||
        error.code === "22007") {
      return res.status(400).json({
        message: "One or more supplied fields have an invalid value"
      });
    }

    console.error("Doctor registration error:", error.message);

    return res.status(500).json({
      message: "Doctor registration failed"
    });
  } finally {
    client.release();
  }
});


module.exports = router;
