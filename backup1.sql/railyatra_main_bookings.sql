-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: railyatra_main
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `pnr` char(10) NOT NULL,
  `user_id` bigint NOT NULL,
  `journey_id` bigint NOT NULL,
  `class_code` varchar(3) NOT NULL,
  `from_station_code` varchar(15) NOT NULL,
  `from_station_name` varchar(150) NOT NULL,
  `from_seq` int NOT NULL,
  `departure_time` varchar(5) DEFAULT NULL,
  `to_station_code` varchar(15) NOT NULL,
  `to_station_name` varchar(150) NOT NULL,
  `to_seq` int NOT NULL,
  `arrival_time` varchar(5) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  `total_fare_paise` int NOT NULL,
  `contact_email` varchar(254) NOT NULL,
  `contact_phone` varchar(15) DEFAULT NULL,
  `hold_expires_at` timestamp NULL DEFAULT NULL,
  `idempotency_key` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bookings_pnr` (`pnr`),
  UNIQUE KEY `uk_bookings_idem` (`user_id`,`idempotency_key`),
  KEY `idx_bookings_user` (`user_id`,`created_at`),
  KEY `idx_bookings_hold` (`status`,`hold_expires_at`),
  KEY `fk_booking_journey` (`journey_id`),
  KEY `fk_booking_fare` (`class_code`),
  CONSTRAINT `fk_booking_fare` FOREIGN KEY (`class_code`) REFERENCES `fare_rules` (`class_code`),
  CONSTRAINT `fk_booking_journey` FOREIGN KEY (`journey_id`) REFERENCES `journeys` (`id`),
  CONSTRAINT `fk_booking_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_booking_seq` CHECK ((`from_seq` < `to_seq`)),
  CONSTRAINT `chk_booking_status` CHECK ((`status` in (_utf8mb4'PENDING_PAYMENT',_utf8mb4'CONFIRMED',_utf8mb4'CANCELLED',_utf8mb4'EXPIRED',_utf8mb4'FAILED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-22 19:02:05
