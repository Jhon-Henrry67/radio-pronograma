<?php
header('Content-Type: application/json; charset=utf-8');

require_once 'config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'healthcheck':
        echo json_encode(['status' => 'ok']);
        exit;
    case 'debug':
        $stmt = $pdo->query("SELECT id, nombre, usuario, rol FROM usuarios");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    case 'login':
        if ($method !== 'POST') { http_response_code(405); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE usuario = ? AND contraseña = ?");
        $stmt->execute([$data['usuario'] ?? '', $data['contraseña'] ?? '']);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            unset($user['contraseña']);
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas']);
        }
        exit;
    
    case 'register':
        if ($method !== 'POST') { http_response_code(405); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ?");
        $stmt->execute([$data['usuario'] ?? '']);
        if ($stmt->fetch()) { echo json_encode(['success' => false, 'error' => 'El usuario ya existe']); exit; }
        $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, usuario, contraseña, rol) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['nombre'] ?? '', $data['usuario'] ?? '', $data['contraseña'] ?? '', $data['rol'] ?? 'personal']);
        echo json_encode(['success' => true]);
        exit;
    
    case 'getSchedule':
        $stmt = $pdo->query("SELECT * FROM horarios ORDER BY FIELD(dia, 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'), hora_inicio");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    
    case 'addShift':
        if ($method !== 'POST') { http_response_code(405); exit; }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $nombre = trim($data['personal_nombre'] ?? '');
        $dia = $data['dia'] ?? '';
        $horaInicio = intval($data['hora_inicio'] ?? 0);
        $horaFin = intval($data['hora_fin'] ?? 0);
        
        if (empty($nombre) || empty($dia) || $horaInicio >= $horaFin) {
            echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
            exit;
        }
        
        // Check for conflicts
        $stmt = $pdo->prepare("SELECT id, personal_nombre, hora_inicio, hora_fin FROM horarios WHERE dia = ? AND hora_inicio < ? AND hora_fin > ?");
        $stmt->execute([$dia, $horaFin, $horaInicio]);
        $conflict = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($conflict) {
            echo json_encode([
                'success' => false, 
                'error' => 'Conflicto: ' . $conflict['personal_nombre'] . ' ya está en ese horario (' . formatHourPHP($conflict['hora_inicio']) . ' - ' . formatHourPHP($conflict['hora_fin']) . ')'
            ]);
            exit;
        }
        
        $stmt = $pdo->prepare("INSERT INTO horarios (dia, personal_nombre, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)");
        $stmt->execute([$dia, $nombre, $horaInicio, $horaFin]);
        
        echo json_encode(['success' => true]);
        exit;
    
    case 'deleteShift':
        if ($method !== 'POST') { http_response_code(405); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("DELETE FROM horarios WHERE id = ?");
        $stmt->execute([$data['id'] ?? 0]);
        echo json_encode(['success' => true]);
        exit;
    
    default:
        echo json_encode(['error' => 'Acción no válida']);
        exit;
}

function formatHourPHP($h) {
    if ($h == 0) return '12:00 AM';
    if ($h == 12) return '12:00 PM';
    return $h < 12 ? $h . ':00 AM' : ($h - 12) . ':00 PM';
}
