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
-- Table structure for table `agent_delegations`
--

DROP TABLE IF EXISTS `agent_delegations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_delegations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `owner_user_id` bigint NOT NULL,
  `name` varchar(60) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'ACTIVE',
  `scopes` varchar(200) NOT NULL,
  `max_fare_per_booking_paise` int NOT NULL,
  `max_spend_24h_paise` int NOT NULL,
  `max_passengers` int NOT NULL DEFAULT '4',
  `allowed_classes` varchar(40) DEFAULT NULL,
  `saved_passengers_only` tinyint(1) NOT NULL DEFAULT '1',
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_deleg_owner` (`owner_user_id`,`status`),
  CONSTRAINT `fk_deleg_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_deleg_passengers` CHECK ((`max_passengers` between 1 and 6)),
  CONSTRAINT `chk_deleg_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'REVOKED')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_delegations`
--

LOCK TABLES `agent_delegations` WRITE;
/*!40000 ALTER TABLE `agent_delegations` DISABLE KEYS */;
INSERT INTO `agent_delegations` VALUES (1,1,'My assistant','ACTIVE','search read_profile read_passengers book read_bookings',50000,100000,2,'SL',1,'2026-11-04 18:06:20','2026-10-28 18:06:20',NULL),(2,1,'chatgpt','ACTIVE','search read_profile read_passengers book read_bookings',50000,100000,2,'SL,3A,2A,1A,CC,3E,2S,EC',1,'2026-11-04 19:26:05','2026-10-28 19:26:05',NULL),(3,1,'Test assistant','REVOKED','search read_profile read_passengers book read_bookings cancel',50000,100000,2,'SL',1,'2026-11-04 20:12:06','2026-10-28 20:12:06','2026-10-28 20:17:40'),(4,1,'Test assistant','ACTIVE','search read_profile read_passengers book read_bookings cancel',50000,100000,2,'SL',1,'2026-11-04 20:19:00','2026-10-28 20:19:00',NULL),(5,1,'Test assistant','ACTIVE','search read_profile read_passengers book read_bookings cancel',50000,100000,2,'SL',1,'2026-11-04 20:19:06','2026-10-28 20:19:06',NULL),(6,1,'No-book assistant','ACTIVE','search read_profile',50000,100000,2,'SL',1,'2026-11-04 20:20:44','2026-10-28 20:20:44',NULL);
/*!40000 ALTER TABLE `agent_delegations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-29  1:53:38
