<?php
include_once __DIR__ . "/../config/db.php";

/* Handle both form-data and JSON */
$data = $_POST;

if (empty($data)) {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
}

if (
    !isset($data['user_id']) ||
    !isset($data['title']) ||
    !isset($data['priority'])
) {
    echo json_encode([
        "success" => false,
        "message" => "Missing fields",
        "received" => $data
    ]);
    exit;
}

$user_id  = $data['user_id'];
$title    = $data['title'];
$priority = $data['priority'];

$sql = "INSERT INTO tasks (user_id, title, priority)
        VALUES ('$user_id', '$title', '$priority')";

if (mysqli_query($conn, $sql)) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode([
        "success" => false,
        "error" => mysqli_error($conn)
    ]);
}
?>
