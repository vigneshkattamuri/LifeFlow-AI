<?php
header("Content-Type: application/json");
require_once __DIR__ . "/../config/db.php";
// adjust if your db file path is different

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Only POST allowed"]);
    exit;
}

// Validate inputs safely
$email = $_POST['email'] ?? null;
$password = $_POST['password'] ?? null;

if (!$email || !$password) {
    echo json_encode([
        "success" => false,
        "message" => "Email and password are required"
    ]);
    exit;
}

// Fetch user
$stmt = $conn->prepare("SELECT id, full_name, email, password, created_at FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);
    exit;
}

$user = $result->fetch_assoc();

// Verify password
if (!password_verify($password, $user['password'])) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid password"
    ]);
    exit;
}

// Success response
echo json_encode([
    "success" => true,
    "user" => [
        "id" => $user['id'],
        "full_name" => $user['full_name'],
        "email" => $user['email'],
        "created_at" => $user['created_at']
    ]
]);
