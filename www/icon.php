<?php
header('Content-Type: image/png');
header('Cache-Control: max-age=86400');

$size = isset($_GET['size']) ? intval($_GET['size']) : 192;
$size = max(48, min(512, $size));

$im = imagecreatetruecolor($size, $size);

// Colors
$bg = imagecolorallocate($im, 99, 102, 241);    // #6366f1
$white = imagecolorallocate($im, 255, 255, 255);
$shadow = imagecolorallocate($im, 79, 70, 229);  // #4f46e5

// Rounded rectangle background
$radius = $size * 0.2;
imagefilledrectangle($im, $radius, 0, $size - $radius, $size, $bg);
imagefilledrectangle($im, 0, $radius, $size, $size - $radius, $bg);
imagefilledellipse($im, $radius, $radius, $radius * 2, $radius * 2, $bg);
imagefilledellipse($im, $size - $radius, $radius, $radius * 2, $radius * 2, $bg);
imagefilledellipse($im, $radius, $size - $radius, $radius * 2, $radius * 2, $bg);
imagefilledellipse($im, $size - $radius, $size - $radius, $radius * 2, $radius * 2, $bg);

// Microphone icon (simplified)
$cx = $size / 2;
$cy = $size / 2;

// Mic body
$micW = $size * 0.12;
$micH = $size * 0.22;
imagefilledrectangle($im, $cx - $micW, $cy - $micH, $cx + $micW, $cy + $micH * 0.3, $white);

// Mic top (rounded)
imagefilledellipse($im, $cx, $cy - $micH, $micW * 2, $micW * 2, $white);

// Mic stand
imageline($im, $cx, $cy + $micH * 0.3, $cx, $cy + $micH * 0.8, $white);
imageline($im, $cx - $micW * 1.5, $cy + $micH * 0.8, $cx + $micW * 1.5, $cy + $micH * 0.8, $white);

imagepng($im);
imagedestroy($im);
