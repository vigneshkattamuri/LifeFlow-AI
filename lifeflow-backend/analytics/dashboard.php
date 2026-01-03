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

/* count completed habits */
$habits = mysqli_fetch_assoc(mysqli_query(
    $conn,
    "SELECT COUNT(*) c
     FROM habit_logs hl
     JOIN habits h ON hl.habit_id = h.id
     WHERE h.user_id = '$user_id'
     AND hl.status = 'Completed'"
))['c'];

/* count completed tasks */
$tasks = mysqli_fetch_assoc(mysqli_query(
    $conn,
    "SELECT COUNT(*) c
     FROM tasks
     WHERE user_id = '$user_id'
     AND status = 'Completed'"
))['c'];

/* productivity score */
$score = min(100, ($habits * 10 + $tasks * 5));

echo json_encode([
    "habits_completed" => (int)$habits,
    "tasks_completed" => (int)$tasks,
    "productivity_score" => $score
]);
?>
