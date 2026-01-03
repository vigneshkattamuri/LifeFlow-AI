<?php
include_once __DIR__."/../config/db.php";

$user_id = $_GET['user_id'];

$res = mysqli_query($conn,
 "SELECT h.id, h.habit_name, h.category, h.energy,
         s.current_streak, s.longest_streak
  FROM habits h
  JOIN streaks s ON h.id = s.habit_id
  WHERE h.user_id='$user_id'"
);

echo json_encode(mysqli_fetch_all($res, MYSQLI_ASSOC));
?>
