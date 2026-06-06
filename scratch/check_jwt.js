const jwt = require('jsonwebtoken');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTAxNTNiM2NiODY1NWMwZjEzZTJjODYiLCJyb2xlIjoiYWRtaW4iLCJJZCI6ImFkbWluMDEiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc3ODQ3NjYxMiwiZXhwIjoxNzc5MDgxNDEyfQ.JPQx95R6yt7MTGh13ZEzxBjhE1i6Qj2RcAPXTdJGffw";
const secret = "jodksjfoiadjdsfj";

try {
    const decoded = jwt.verify(token, secret);
    console.log("Success:", decoded);
} catch (err) {
    console.log("Error:", err.message);
}
