<?php
include_once __DIR__."/../config/db.php";

$user_id = $_POST['user_id'];
$name = $_POST['habit_name'];
$category = $_POST['category'];
$energy = $_POST['energy'];

mysqli_query($conn,
 "INSERT INTO habits(user_id,habit_name,category,energy)
  VALUES('$user_id','$name','$category','$energy')"
);

$habit_id = mysqli_insert_id($conn);
mysqli_query($conn,
 "INSERT INTO streaks(habit_id,current_streak,longest_streak)
  VALUES('$habit_id',0,0)"
);

echo json_encode(["success"=>true]);
?>
