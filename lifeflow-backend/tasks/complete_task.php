<?php
include_once __DIR__."/../config/db.php";

$task_id = $_POST['task_id'];

mysqli_query($conn,
 "UPDATE tasks SET status='Completed' WHERE id='$task_id'"
);

echo json_encode(["success"=>true]);
?>
