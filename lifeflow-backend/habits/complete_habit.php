<?php
include_once __DIR__."/../config/db.php";

$habit_id = $_POST['habit_id'];
$today = date("Y-m-d");

/* log completion */
mysqli_query($conn,
 "INSERT INTO habit_logs(habit_id,log_date,status)
  VALUES('$habit_id','$today','Completed')"
);

/* update streak */
$res = mysqli_query($conn,
 "SELECT current_streak,longest_streak FROM streaks WHERE habit_id='$habit_id'"
);
$row = mysqli_fetch_assoc($res);

$current = $row['current_streak'] + 1;
$longest = max($current, $row['longest_streak']);

mysqli_query($conn,
 "UPDATE streaks
  SET current_streak=$current, longest_streak=$longest
  WHERE habit_id='$habit_id'"
);

echo json_encode([
  "success"=>true,
  "current_streak"=>$current,
  "longest_streak"=>$longest
]);
?>
