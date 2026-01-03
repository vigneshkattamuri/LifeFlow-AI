<?php


$conn = mysqli_connect(
    "localhost",
    "lifeflow_user",
    "lifeflow123",
    "lifeflow_ai",
    3307
);

if (!$conn) {
    die("DB Connection Failed: " . mysqli_connect_error());
}
?>
