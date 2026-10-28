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
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `payment_id` bigint NOT NULL,
  `booking_id` bigint NOT NULL,
  `amount_paise` int NOT NULL,
  `reason` varchar(20) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'PENDING',
  `gateway_refund_id` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refund_payment` (`payment_id`),
  KEY `idx_refund_status` (`status`,`id`),
  KEY `fk_refund_booking` (`booking_id`),
  CONSTRAINT `fk_refund_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `fk_refund_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
  CONSTRAINT `chk_refund_amount` CHECK ((`amount_paise` > 0)),
  CONSTRAINT `chk_refund_reason` CHECK ((`reason` in (_utf8mb4'CANCELLATION',_utf8mb4'LATE_PAYMENT',_utf8mb4'DUPLICATE_PAYMENT'))),
  CONSTRAINT `chk_refund_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'PROCESSED',_utf8mb4'FAILED')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
INSERT INTO `refunds` VALUES (1,1,137,6000,'CANCELLATION','PROCESSED','mock_rfnd_ee99fd62409c5cc7','2026-10-26 21:32:11','2026-10-26 21:32:11');
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-29  1:53:40
