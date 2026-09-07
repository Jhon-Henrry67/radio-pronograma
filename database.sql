-- ============================================
-- BASE DE DATOS: radio_pronograma
-- ============================================

CREATE DATABASE IF NOT EXISTS radio_pronograma;
USE radio_pronograma;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'personal') DEFAULT 'personal',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de turnos
CREATE TABLE IF NOT EXISTS horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dia ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes') NOT NULL,
    personal_nombre VARCHAR(100) NOT NULL,
    hora_inicio INT NOT NULL,
    hora_fin INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dia (dia),
    INDEX idx_nombre (personal_nombre)
);

-- Admin por defecto
INSERT INTO usuarios (nombre, usuario, contraseña, rol) 
VALUES ('Administrador', 'admin', 'admin123', 'admin')
ON DUPLICATE KEY UPDATE usuario = 'admin';
