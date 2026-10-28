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
-- Table structure for table `agent_actions`
--

DROP TABLE IF EXISTS `agent_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_actions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `delegation_id` bigint NOT NULL,
  `actor` varchar(10) NOT NULL DEFAULT 'API',
  `method` varchar(8) DEFAULT NULL,
  `path` varchar(200) DEFAULT NULL,
  `query` varchar(500) DEFAULT NULL,
  `status_code` int DEFAULT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_actions_deleg` (`delegation_id`,`id`),
  CONSTRAINT `fk_actions_deleg` FOREIGN KEY (`delegation_id`) REFERENCES `agent_delegations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_actions`
--

LOCK TABLES `agent_actions` WRITE;
/*!40000 ALTER TABLE `agent_actions` DISABLE KEYS */;
INSERT INTO `agent_actions` VALUES (1,1,'API','GET','/api/v1/users/me',NULL,200,NULL,'2026-10-28 18:23:15'),(2,2,'API','GET','/api/v1/stations/suggest','q=pune',403,NULL,'2026-10-28 19:41:32'),(3,2,'API','GET','/api/v1/stations/suggest','q=latur',403,NULL,'2026-10-28 19:41:32'),(4,2,'API','GET','/api/v1/trains/search','from=PUNE&to=LUR',403,NULL,'2026-10-28 19:41:42'),(5,2,'API','GET','/api/v1/users/me',NULL,200,NULL,'2026-10-28 19:42:17'),(6,2,'API','GET','/api/v1/users/me/passengers',NULL,200,NULL,'2026-10-28 19:42:17'),(7,1,'API','GET','/api/v1/users/me',NULL,200,NULL,'2026-10-28 19:55:41'),(8,1,'API','GET','/api/v1/users/me/passengers',NULL,200,NULL,'2026-10-28 19:55:52'),(9,1,'API','GET','/api/v1/users/me/search%20%20',NULL,403,NULL,'2026-10-28 19:56:05'),(10,3,'API','GET','/api/v1/availability','trainNo=01488&date=2026-10-29&from=HGL&to=KWV',503,NULL,'2026-10-28 20:12:19'),(11,3,'API','GET','/api/v1/journeys/open-dates','trainNo=01488',200,NULL,'2026-10-28 20:12:31'),(12,3,'API','GET','/api/v1/availability','trainNo=01488&date=2026-10-29&from=HGL&to=KWV',503,NULL,'2026-10-28 20:12:37'),(13,3,'API','GET','/api/v1/availability','trainNo=01488&date=2026-10-29&from=HGL&to=KWV',503,NULL,'2026-10-28 20:12:48'),(14,3,'API','GET','/api/v1/journeys/open-dates','trainNo=01488',200,NULL,'2026-10-28 20:13:12'),(15,3,'API','GET','/api/v1/users/me',NULL,200,NULL,'2026-10-28 20:13:16'),(16,3,'API','GET','/api/v1/users/me/passengers',NULL,200,NULL,'2026-10-28 20:13:20'),(17,3,'API','POST','/api/v1/bookings',NULL,503,NULL,'2026-10-28 20:13:25'),(18,3,'API','GET','/api/v1/bookings','page=0&size=5',200,NULL,'2026-10-28 20:13:39'),(19,3,'API','GET','/api/v1/bookings/null',NULL,404,NULL,'2026-10-28 20:14:05'),(20,3,'API','GET','/api/v1/bookings/6419474879',NULL,200,NULL,'2026-10-28 20:14:23'),(21,3,'API','GET','/api/v1/bookings/6419474879/ticket',NULL,200,NULL,'2026-10-28 20:14:32'),(22,3,'API','GET','/api/v1/pnr/6419474879',NULL,200,NULL,'2026-10-28 20:14:40'),(23,3,'API','GET','/api/v1/availability','trainNo=01488&date=2026-10-29&from=HGL&to=KWV',200,NULL,'2026-10-28 20:15:24'),(24,3,'API','POST','/api/v1/users/me/passengers',NULL,403,NULL,'2026-10-28 20:16:02'),(25,3,'API','POST','/api/v1/bookings',NULL,403,NULL,'2026-10-28 20:16:29'),(26,3,'API','POST','/api/v1/bookings',NULL,403,NULL,'2026-10-28 20:16:43'),(27,3,'API','POST','/api/v1/bookings',NULL,403,NULL,'2026-10-28 20:16:54'),(28,3,'API','GET','/api/v1/availability','trainNo=01488&date=2026-10-29&from=HGL&to=KWV',401,NULL,'2026-10-28 20:17:49'),(29,3,'API','GET','/api/v1/availability','trainNo=01488&date=2026-10-29&from=HGL&to=KWV',401,NULL,'2026-10-28 20:18:18'),(30,5,'API','GET','/api/v1/bookings','page=0&size=5',200,NULL,'2026-10-28 20:19:17'),(31,5,'API','GET','/api/v1/bookings/6419474879/ticket',NULL,200,NULL,'2026-10-28 20:19:22'),(32,5,'API','POST','/api/v1/agent/delegations',NULL,403,NULL,'2026-10-28 20:19:54'),(33,5,'API','POST','/api/v1/bookings',NULL,403,NULL,'2026-10-28 20:20:00'),(34,5,'API','POST','/api/v1/dev/bookings/6419474879/confirm',NULL,403,NULL,'2026-10-28 20:20:24');
/*!40000 ALTER TABLE `agent_actions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-29  1:53:39
