<?php
include_once __DIR__ . "/../config/db.php";

if (!isset($_GET['user_id'])) {
    echo json_encode([
        "success" => false,
        "message" => "user_id missing"
    ]);
    exit;
}

$user_id = $_GET['user_id'];

$res = mysqli_query($conn,
 "SELECT id, title, priority, status, created_at
  FROM tasks
  WHERE user_id = '$user_id'"
);

echo json_encode(mysqli_fetch_all($res, MYSQLI_ASSOC));
?>
