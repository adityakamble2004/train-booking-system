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
-- Table structure for table `booking_passengers`
--

DROP TABLE IF EXISTS `booking_passengers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_passengers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `booking_id` bigint NOT NULL,
  `name` varchar(100) NOT NULL,
  `date_of_birth` date NOT NULL,
  `age_at_journey` int NOT NULL,
  `gender` char(1) NOT NULL,
  `berth_preference` varchar(20) DEFAULT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'CNF',
  `coach_no` varchar(4) DEFAULT NULL,
  `seat_no` int DEFAULT NULL,
  `berth_type` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bp_booking` (`booking_id`),
  CONSTRAINT `fk_bp_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_bp_gender` CHECK ((`gender` in (_utf8mb4'M',_utf8mb4'F',_utf8mb4'O'))),
  CONSTRAINT `chk_bp_status` CHECK ((`status` in (_utf8mb4'CNF',_utf8mb4'CAN')))
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_passengers`
--

LOCK TABLES `booking_passengers` WRITE;
/*!40000 ALTER TABLE `booking_passengers` DISABLE KEYS */;
INSERT INTO `booking_passengers` VALUES (1,1,'Aditya Kamble','2001-08-14',25,'M','LOWER','CAN','S1',1,'LOWER'),(2,2,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',1,'LOWER'),(3,3,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',2,'MIDDLE'),(4,4,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',3,'UPPER'),(5,5,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',4,'LOWER'),(6,6,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',5,'MIDDLE'),(7,7,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',6,'UPPER'),(8,8,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',7,'SIDE_LOWER'),(9,9,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',8,'SIDE_UPPER'),(10,10,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',9,'LOWER'),(11,11,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',10,'MIDDLE'),(12,12,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',11,'UPPER'),(13,13,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',12,'LOWER'),(14,14,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',13,'MIDDLE'),(15,15,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',14,'UPPER'),(16,16,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',15,'SIDE_LOWER'),(17,17,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',16,'SIDE_UPPER'),(18,18,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',17,'LOWER'),(19,19,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',18,'MIDDLE'),(20,20,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',19,'UPPER'),(21,21,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',20,'LOWER'),(22,22,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',21,'MIDDLE'),(23,23,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',22,'UPPER'),(24,24,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',23,'SIDE_LOWER'),(25,25,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',24,'SIDE_UPPER'),(26,26,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',25,'LOWER'),(27,27,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',26,'MIDDLE'),(28,28,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',27,'UPPER'),(29,29,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',28,'LOWER'),(30,30,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',29,'MIDDLE'),(31,31,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',30,'UPPER'),(32,32,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',31,'SIDE_LOWER'),(33,33,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',32,'SIDE_UPPER'),(34,34,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',33,'LOWER'),(35,35,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',34,'MIDDLE'),(36,36,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',35,'UPPER'),(37,37,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',36,'LOWER'),(38,38,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',37,'MIDDLE'),(39,39,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',38,'UPPER'),(40,40,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',39,'SIDE_LOWER'),(41,41,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',40,'SIDE_UPPER'),(42,42,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',41,'LOWER'),(43,43,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',42,'MIDDLE'),(44,44,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',43,'UPPER'),(45,45,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',44,'LOWER'),(46,46,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',45,'MIDDLE'),(47,47,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',46,'UPPER'),(48,48,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',47,'SIDE_LOWER'),(49,49,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',48,'SIDE_UPPER'),(50,50,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',49,'LOWER'),(51,51,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',50,'MIDDLE'),(52,52,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',51,'UPPER'),(53,53,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',52,'LOWER'),(54,54,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',53,'MIDDLE'),(55,55,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',54,'UPPER'),(56,56,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',55,'SIDE_LOWER'),(57,57,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',56,'SIDE_UPPER'),(58,58,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',57,'LOWER'),(59,59,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',58,'MIDDLE'),(60,60,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',59,'UPPER'),(61,61,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',60,'LOWER'),(62,62,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',61,'MIDDLE'),(63,63,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',62,'UPPER'),(64,64,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',63,'SIDE_LOWER'),(65,65,'Race Test','1999-01-01',27,'M',NULL,'CAN','B1',64,'SIDE_UPPER'),(66,66,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',1,'LOWER'),(67,67,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',2,'MIDDLE'),(68,68,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',3,'UPPER'),(69,69,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',4,'LOWER'),(70,70,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',5,'MIDDLE'),(71,71,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',6,'UPPER'),(72,72,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',7,'SIDE_LOWER'),(73,73,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',8,'SIDE_UPPER'),(74,74,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',9,'LOWER'),(75,75,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',10,'MIDDLE'),(76,76,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',11,'UPPER'),(77,77,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',12,'LOWER'),(78,78,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',13,'MIDDLE'),(79,79,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',14,'UPPER'),(80,80,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',15,'SIDE_LOWER'),(81,81,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',16,'SIDE_UPPER'),(82,82,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',17,'LOWER'),(83,83,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',18,'MIDDLE'),(84,84,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',19,'UPPER'),(85,85,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',20,'LOWER'),(86,86,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',21,'MIDDLE'),(87,87,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',22,'UPPER'),(88,88,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',23,'SIDE_LOWER'),(89,89,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',24,'SIDE_UPPER'),(90,90,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',25,'LOWER'),(91,91,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',26,'MIDDLE'),(92,92,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',27,'UPPER'),(93,93,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',28,'LOWER'),(94,94,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',29,'MIDDLE'),(95,95,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',30,'UPPER'),(96,96,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',31,'SIDE_LOWER'),(97,97,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',32,'SIDE_UPPER'),(98,98,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',33,'LOWER'),(99,99,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',34,'MIDDLE'),(100,100,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',35,'UPPER'),(101,101,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',36,'LOWER'),(102,102,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',37,'MIDDLE'),(103,103,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',38,'UPPER'),(104,104,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',39,'SIDE_LOWER'),(105,105,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',40,'SIDE_UPPER'),(106,106,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',41,'LOWER'),(107,107,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',42,'MIDDLE'),(108,108,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',43,'UPPER'),(109,109,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',44,'LOWER'),(110,110,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',45,'MIDDLE'),(111,111,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',46,'UPPER'),(112,112,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',47,'SIDE_LOWER'),(113,113,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',48,'SIDE_UPPER'),(114,114,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',49,'LOWER'),(115,115,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',50,'MIDDLE'),(116,116,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',51,'UPPER'),(117,117,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',52,'LOWER'),(118,118,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',53,'MIDDLE'),(119,119,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',54,'UPPER'),(120,120,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',55,'SIDE_LOWER'),(121,121,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',56,'SIDE_UPPER'),(122,122,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',57,'LOWER'),(123,123,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',58,'MIDDLE'),(124,124,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',59,'UPPER'),(125,125,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',60,'LOWER'),(126,126,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',61,'MIDDLE'),(127,127,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',62,'UPPER'),(128,128,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',63,'SIDE_LOWER'),(129,129,'Aditya Race Test 2','2000-05-15',26,'M',NULL,'CAN','B1',64,'SIDE_UPPER'),(130,130,'Kamble Aditya balaji','2004-06-22',22,'M','MIDDLE','CAN','B1',2,'MIDDLE'),(131,131,'Kamble Aditya balaji','2004-03-22',22,'M','LOWER','CAN','B1',1,'LOWER'),(132,132,'Kamble Aditya balaji','2000-02-20',26,'M','MIDDLE','CAN','B1',2,'MIDDLE'),(133,133,'Kamble Aditya balaji','2000-06-22',26,'M','LOWER','CAN','B1',1,'LOWER'),(134,134,'Aaditya Kamble','2000-06-02',26,'M','UPPER','CAN','B1',3,'UPPER'),(135,135,'Kamble Aditya balaji','2000-02-22',26,'M','MIDDLE','CNF','B1',2,'MIDDLE'),(136,136,'Kamble Aditya balaji','2004-06-22',22,'M','LOWER','CNF','A1',1,'LOWER'),(137,137,'Aditya Kamble','2001-08-14',25,'M','LOWER','CAN','S1',1,'LOWER');
/*!40000 ALTER TABLE `booking_passengers` ENABLE KEYS */;
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
