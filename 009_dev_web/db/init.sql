-- Base de Datos para DataSphere

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Seguridad
CREATE TABLE Roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE UserRoles (
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES Roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Insertar roles base
INSERT INTO Roles (name) VALUES ('READ_ONLY'), ('READ_WRITE');

-- Insertar usuarios base con cifrado nativo de PostgreSQL compatible con bcrypt
INSERT INTO Users (username, password_hash) VALUES 
('user_write', crypt('123', gen_salt('bf', 10))),
('user_read', crypt('321', gen_salt('bf', 10)));

-- Vincular usuarios con sus roles
INSERT INTO UserRoles (user_id, role_id) VALUES 
(1, (SELECT id FROM Roles WHERE name = 'READ_WRITE')),
(2, (SELECT id FROM Roles WHERE name = 'READ_ONLY'));

-- 2. Dominio (Activos y Riesgos)

-- Activos
CREATE TABLE Categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Peligros naturales
CREATE TABLE Hazards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Factores 
CREATE TABLE Conditions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 4. ENTIDAD PRINCIPAL: ACTIVOS (Assets)
CREATE TABLE Assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    category_id INTEGER REFERENCES Categories(id) ON DELETE RESTRICT,
    base_value DECIMAL(15,2) NOT NULL, -- Valor económico base
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. RELACIÓN MUCHOS-A-MUCHOS: EXPOSICIÓN AL RIESGO
-- Esta tabla vincula un Activo con un Peligro, y añade el valor expuesto
CREATE TABLE AssetHazardExposure (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES Assets(id) ON DELETE CASCADE,
    hazard_id INTEGER REFERENCES Hazards(id) ON DELETE CASCADE,
    exposure_value DECIMAL(15,2) NOT NULL, -- Dinero en riesgo por este peligro
    UNIQUE(asset_id, hazard_id)
);

-- 6. RELACIÓN MUCHOS-A-MUCHOS: CONDICIONES DEL ACTIVO
CREATE TABLE AssetConditions (
    asset_id INTEGER REFERENCES Assets(id) ON DELETE CASCADE,
    condition_id INTEGER REFERENCES Conditions(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, condition_id)
);

-- 3. Inserción de Datos de Prueba (Dummy Data)
INSERT INTO Categories (name) VALUES ('Patrimonio Histórico'), ('Instalación Deportiva'), ('Infraestructura Crítica');
INSERT INTO Hazards (name) VALUES ('Tornado'), ('Terremoto'), ('Inundación'), ('Huracán'), ('Incendio Forestal');
INSERT INTO Conditions (name) VALUES ('Cerca de la costa'), ('Zona Sísmica Activa'), ('Estructura Antigua'), ('Sismorresistente');

-- Insertar Activos base
INSERT INTO Assets (id, name, latitude, longitude, category_id, base_value) VALUES
-- Barcelona
(1, 'Sagrada Familia', 41.4036, 2.1744, (SELECT id FROM Categories WHERE name = 'Patrimonio Histórico'), 500000000.0),
(2, 'Spotify Camp Nou', 41.3809, 2.1228, (SELECT id FROM Categories WHERE name = 'Instalación Deportiva'), 800000000.0),
-- Madrid
(3, 'Santiago Bernabéu', 40.4530, -3.6883, (SELECT id FROM Categories WHERE name = 'Instalación Deportiva'), 900000000.0),
(4, 'Museo del Prado', 40.4138, -3.6921, (SELECT id FROM Categories WHERE name = 'Patrimonio Histórico'), 450000000.0),
-- Bilbao
(5, 'Museo Guggenheim', 43.2687, -2.9340, (SELECT id FROM Categories WHERE name = 'Patrimonio Histórico'), 150000000.0),
(6, 'Campo San Mamés', 43.2642, -2.9493, (SELECT id FROM Categories WHERE name = 'Instalación Deportiva'), 210000000.0),
-- Galicia
(7, 'Catedral de Santiago de Compostela', 42.8806, -8.5446, (SELECT id FROM Categories WHERE name = 'Patrimonio Histórico'), 300000000.0),
(8, 'Estadio de Balaídos', 42.2123, -8.7401, (SELECT id FROM Categories WHERE name = 'Instalación Deportiva'), 40000000.0),
-- Andalucia
(9, 'La Alhambra', 37.1760, -3.5881, (SELECT id FROM Categories WHERE name = 'Patrimonio Histórico'), 600000000.0),
(10, 'Estadio Benito Villamarín', 37.3565, -5.9818, (SELECT id FROM Categories WHERE name = 'Instalación Deportiva'), 120000000.0);

-- Reset sequence for assets
SELECT setval('assets_id_seq', (SELECT MAX(id) FROM Assets));

-- Vincular Activos con Peligros (Todos los activos tienen un riesgo asignado)
INSERT INTO AssetHazardExposure (asset_id, hazard_id, exposure_value) VALUES
(1, (SELECT id FROM Hazards WHERE name = 'Terremoto'), 50000000.0),
(2, (SELECT id FROM Hazards WHERE name = 'Tornado'), 80000000.0),
(3, (SELECT id FROM Hazards WHERE name = 'Inundación'), 100000000.0),
(4, (SELECT id FROM Hazards WHERE name = 'Incendio Forestal'), 45000000.0),
(5, (SELECT id FROM Hazards WHERE name = 'Inundación'), 15000000.0),
(6, (SELECT id FROM Hazards WHERE name = 'Huracán'), 21000000.0),
(7, (SELECT id FROM Hazards WHERE name = 'Huracán'), 30000000.0),
(8, (SELECT id FROM Hazards WHERE name = 'Inundación'), 10000000.0),
(9, (SELECT id FROM Hazards WHERE name = 'Terremoto'), 120000000.0),
(10, (SELECT id FROM Hazards WHERE name = 'Tornado'), 12000000.0);

-- Vincular Activos con sus Condiciones (Todos los activos tienen una condición)
INSERT INTO AssetConditions (asset_id, condition_id) VALUES
(1, (SELECT id FROM Conditions WHERE name = 'Estructura Antigua')),
(2, (SELECT id FROM Conditions WHERE name = 'Cerca de la costa')),
(3, (SELECT id FROM Conditions WHERE name = 'Sismorresistente')),
(4, (SELECT id FROM Conditions WHERE name = 'Estructura Antigua')),
(5, (SELECT id FROM Conditions WHERE name = 'Cerca de la costa')),
(6, (SELECT id FROM Conditions WHERE name = 'Sismorresistente')),
(7, (SELECT id FROM Conditions WHERE name = 'Estructura Antigua')),
(8, (SELECT id FROM Conditions WHERE name = 'Cerca de la costa')),
(9, (SELECT id FROM Conditions WHERE name = 'Zona Sísmica Activa')),
(10, (SELECT id FROM Conditions WHERE name = 'Sismorresistente'));
