<?php
include_once __DIR__."/../config/db.php";

$habit_id = $_POST['habit_id'];
$reason = $_POST['reason'];
$today = date("Y-m-d");

mysqli_query($conn,
 "INSERT INTO habit_logs(habit_id,log_date,status,skip_reason)
  VALUES('$habit_id','$today','Skipped','$reason')"
);

mysqli_query($conn,
 "UPDATE streaks SET current_streak=0 WHERE habit_id='$habit_id'"
);

echo json_encode(["success"=>true,"message"=>"Streak reset"]);
?>
