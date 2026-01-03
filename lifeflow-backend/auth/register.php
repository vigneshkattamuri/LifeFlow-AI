<?php
include_once __DIR__."/../config/db.php";

if (!isset($_POST['name'], $_POST['email'], $_POST['password'])) {
    echo json_encode(["success"=>false,"message"=>"Missing fields"]);
    exit;
}

$name = $_POST['name'];
$email = $_POST['email'];
$password = password_hash($_POST['password'], PASSWORD_BCRYPT);

mysqli_query($conn,
    "INSERT INTO users(full_name,email,password)
     VALUES('$name','$email','$password')"
);

echo json_encode(["success"=>true]);
?>
