-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 09-06-2026 a las 02:34:28
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `kueskipro`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `beneficio`
--

CREATE TABLE `beneficio` (
  `id_Beneficio` varchar(10) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `cashback` int(11) DEFAULT 0,
  `descuento` decimal(5,2) DEFAULT 0.00,
  `id_Kueski` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `beneficio`
--

INSERT INTO `beneficio` (`id_Beneficio`, `codigo`, `cashback`, `descuento`, `id_Kueski`) VALUES
('B001', 'LASFJkj54AJNKJNFAL5', 30, 1.00, 'K001'),
('B002', '453AFSFMOdjfnoak57DAN', 90, 2.00, 'K001'),
('B003', 'codigo', 80, 1.00, 'K001'),
('B1267', 'cupon3', 0, 3.00, 'K002'),
('B2313', 'cupon600', 0, 600.00, 'K002'),
('B4742', 'cupon7', 0, 7.00, 'K002'),
('B5781', 'cupon1', 0, 1.00, 'K003'),
('B6599', 'cupon100', 0, 100.00, 'K003'),
('B6728', 'cupon30', 0, 30.00, 'K003'),
('B7718', 'cupon30', 0, 30.00, 'K004'),
('B7974', 'cupon12', 0, 12.00, 'K004'),
('B8822', 'cupon0383', 0, 383.00, 'K004');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalles_cuenta`
--

CREATE TABLE `detalles_cuenta` (
  `id_Kueski` varchar(10) NOT NULL,
  `credito_disponible` decimal(10,2) NOT NULL,
  `moroso` decimal(10,2) DEFAULT 0.00,
  `correo` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL DEFAULT 'password_provisional',
  `dia_corte` int(11) DEFAULT 15
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `detalles_cuenta`
--

INSERT INTO `detalles_cuenta` (`id_Kueski`, `credito_disponible`, `moroso`, `correo`, `contrasena`, `dia_corte`) VALUES
('K001', 500.00, 5000001.00, 'david_bri@gmail.com', 'contrasena1', 15),
('K002', 10000.00, 5000.00, 'landin_ang@hotmail.com', 'contrasena2', 18),
('K003', 25000.00, 0.00, 'carlosgloria@gmail.com', 'contrasena3', 22),
('K004', 10000.00, 638.00, 'a', 'a', 28);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `kueski_pay_detalles`
--

CREATE TABLE `kueski_pay_detalles` (
  `id_Kpay` varchar(10) NOT NULL,
  `articulo` varchar(100) NOT NULL,
  `tienda` varchar(50) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `fecha` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `kueski_pay_detalles`
--

INSERT INTO `kueski_pay_detalles` (`id_Kpay`, `articulo`, `tienda`, `precio`, `fecha`) VALUES
('KP001', 'playera_la_fiera', 'buffol', 3000.00, '2026-05-02'),
('KP002', 'pantalon_la_fiera', 'buffol', 4500.00, '2026-01-09'),
('KP003', 'ps5', 'Sony', 8988.00, '2026-05-25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transaccion`
--

CREATE TABLE `transaccion` (
  `id_Trans` varchar(10) NOT NULL,
  `id_Usuario` varchar(10) DEFAULT NULL,
  `id_Kpay` varchar(10) DEFAULT NULL,
  `id_Beneficio` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `transaccion`
--

INSERT INTO `transaccion` (`id_Trans`, `id_Usuario`, `id_Kpay`, `id_Beneficio`) VALUES
('T001', 'U001', 'KP001', NULL),
('T002', 'U001', 'KP002', NULL),
('T003', 'U003', 'KP003', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_Usuario` varchar(10) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `p_apellido` varchar(50) NOT NULL,
  `s_apellido` varchar(50) DEFAULT NULL,
  `id_Kueski` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_Usuario`, `nombre`, `p_apellido`, `s_apellido`, `id_Kueski`) VALUES
('U001', 'David', 'Bribiesca', 'Valtierra', 'K001'),
('U002', 'Angel', 'Landin', 'López', 'K002'),
('U003', 'Carlos', 'Gloria', 'Cortes', 'K003'),
('U004', 'Pepe', 'Toño', 'Pérez', 'K004');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `beneficio`
--
ALTER TABLE `beneficio`
  ADD PRIMARY KEY (`id_Beneficio`),
  ADD UNIQUE KEY `unique_user_coupon` (`codigo`,`id_Kueski`),
  ADD KEY `fk_beneficio_kueski` (`id_Kueski`);

--
-- Indices de la tabla `detalles_cuenta`
--
ALTER TABLE `detalles_cuenta`
  ADD PRIMARY KEY (`id_Kueski`),
  ADD UNIQUE KEY `correo` (`correo`);

--
-- Indices de la tabla `kueski_pay_detalles`
--
ALTER TABLE `kueski_pay_detalles`
  ADD PRIMARY KEY (`id_Kpay`);

--
-- Indices de la tabla `transaccion`
--
ALTER TABLE `transaccion`
  ADD PRIMARY KEY (`id_Trans`),
  ADD KEY `id_Usuario` (`id_Usuario`),
  ADD KEY `id_Kpay` (`id_Kpay`),
  ADD KEY `id_Beneficio` (`id_Beneficio`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_Usuario`),
  ADD KEY `id_Kueski` (`id_Kueski`);

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `beneficio`
--
ALTER TABLE `beneficio`
  ADD CONSTRAINT `fk_beneficio_kueski` FOREIGN KEY (`id_Kueski`) REFERENCES `detalles_cuenta` (`id_Kueski`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `transaccion`
--
ALTER TABLE `transaccion`
  ADD CONSTRAINT `transaccion_ibfk_1` FOREIGN KEY (`id_Usuario`) REFERENCES `usuario` (`id_Usuario`),
  ADD CONSTRAINT `transaccion_ibfk_2` FOREIGN KEY (`id_Kpay`) REFERENCES `kueski_pay_detalles` (`id_Kpay`),
  ADD CONSTRAINT `transaccion_ibfk_3` FOREIGN KEY (`id_Beneficio`) REFERENCES `beneficio` (`id_Beneficio`);

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_Kueski`) REFERENCES `detalles_cuenta` (`id_Kueski`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
