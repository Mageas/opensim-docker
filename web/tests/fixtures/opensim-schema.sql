
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `AgentPrefs` (
  `PrincipalID` char(36) NOT NULL,
  `AccessPrefs` char(2) NOT NULL DEFAULT 'M',
  `HoverHeight` double(30,27) NOT NULL DEFAULT 0.000000000000000000000000000,
  `Language` char(5) NOT NULL DEFAULT 'en-us',
  `LanguageIsPublic` tinyint(1) NOT NULL DEFAULT 1,
  `PermEveryone` int(6) NOT NULL DEFAULT 0,
  `PermGroup` int(6) NOT NULL DEFAULT 0,
  `PermNextOwner` int(6) NOT NULL DEFAULT 532480,
  PRIMARY KEY (`PrincipalID`),
  UNIQUE KEY `PrincipalID` (`PrincipalID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Avatars` (
  `PrincipalID` char(36) NOT NULL,
  `Name` varchar(32) NOT NULL,
  `Value` text DEFAULT NULL,
  PRIMARY KEY (`PrincipalID`,`Name`),
  KEY `PrincipalID` (`PrincipalID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Friends` (
  `PrincipalID` varchar(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `Friend` varchar(255) NOT NULL,
  `Flags` varchar(16) NOT NULL DEFAULT '0',
  `Offered` varchar(32) NOT NULL DEFAULT '0',
  PRIMARY KEY (`PrincipalID`(36),`Friend`(36)),
  KEY `PrincipalID` (`PrincipalID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `GridUser` (
  `UserID` varchar(255) NOT NULL,
  `HomeRegionID` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `HomePosition` char(64) NOT NULL DEFAULT '<0,0,0>',
  `HomeLookAt` char(64) NOT NULL DEFAULT '<0,0,0>',
  `LastRegionID` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `LastPosition` char(64) NOT NULL DEFAULT '<0,0,0>',
  `LastLookAt` char(64) NOT NULL DEFAULT '<0,0,0>',
  `Online` char(5) NOT NULL DEFAULT 'false',
  `Login` char(16) NOT NULL DEFAULT '0',
  `Logout` char(16) NOT NULL DEFAULT '0',
  PRIMARY KEY (`UserID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserAccounts` (
  `PrincipalID` char(36) NOT NULL,
  `ScopeID` char(36) NOT NULL,
  `FirstName` varchar(64) NOT NULL,
  `LastName` varchar(64) NOT NULL,
  `Email` varchar(64) DEFAULT NULL,
  `ServiceURLs` text DEFAULT NULL,
  `Created` int(11) DEFAULT NULL,
  `UserLevel` int(11) NOT NULL DEFAULT 0,
  `UserFlags` int(11) NOT NULL DEFAULT 0,
  `UserTitle` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `active` int(11) NOT NULL DEFAULT 1,
  UNIQUE KEY `PrincipalID` (`PrincipalID`),
  KEY `Email` (`Email`),
  KEY `FirstName` (`FirstName`),
  KEY `LastName` (`LastName`),
  KEY `Name` (`FirstName`,`LastName`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `name` varchar(64) NOT NULL,
  `description` varchar(64) NOT NULL,
  `assetType` tinyint(4) NOT NULL,
  `local` tinyint(1) NOT NULL,
  `temporary` tinyint(1) NOT NULL,
  `data` longblob NOT NULL,
  `id` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `create_time` int(11) DEFAULT 0,
  `access_time` int(11) DEFAULT 0,
  `asset_flags` int(11) NOT NULL DEFAULT 0,
  `CreatorID` varchar(128) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth` (
  `UUID` char(36) NOT NULL,
  `passwordHash` char(32) NOT NULL DEFAULT '',
  `passwordSalt` char(32) NOT NULL DEFAULT '',
  `webLoginKey` varchar(255) NOT NULL DEFAULT '',
  `accountType` varchar(32) NOT NULL DEFAULT 'UserAccount',
  PRIMARY KEY (`UUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bakedterrain` (
  `RegionUUID` varchar(255) DEFAULT NULL,
  `Revision` int(11) DEFAULT NULL,
  `Heightfield` longblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `classifieds` (
  `classifieduuid` char(36) NOT NULL,
  `creatoruuid` char(36) NOT NULL,
  `creationdate` int(20) NOT NULL,
  `expirationdate` int(20) NOT NULL,
  `category` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `parceluuid` char(36) NOT NULL,
  `parentestate` int(11) NOT NULL,
  `snapshotuuid` char(36) NOT NULL,
  `simname` varchar(255) NOT NULL,
  `posglobal` varchar(255) NOT NULL,
  `parcelname` varchar(255) NOT NULL,
  `classifiedflags` int(8) NOT NULL,
  `priceforlisting` int(5) NOT NULL,
  PRIMARY KEY (`classifieduuid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `estate_groups` (
  `EstateID` int(10) unsigned NOT NULL,
  `uuid` char(36) NOT NULL,
  KEY `EstateID` (`EstateID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `estate_managers` (
  `EstateID` int(10) unsigned NOT NULL,
  `uuid` char(36) NOT NULL,
  KEY `EstateID` (`EstateID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `estate_map` (
  `RegionID` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `EstateID` int(11) NOT NULL,
  PRIMARY KEY (`RegionID`),
  KEY `EstateID` (`EstateID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `estate_settings` (
  `EstateID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `EstateName` varchar(64) DEFAULT NULL,
  `AbuseEmailToEstateOwner` tinyint(4) NOT NULL,
  `DenyAnonymous` tinyint(4) NOT NULL,
  `ResetHomeOnTeleport` tinyint(4) NOT NULL,
  `FixedSun` tinyint(4) NOT NULL,
  `DenyTransacted` tinyint(4) NOT NULL,
  `BlockDwell` tinyint(4) NOT NULL,
  `DenyIdentified` tinyint(4) NOT NULL,
  `AllowVoice` tinyint(4) NOT NULL,
  `UseGlobalTime` tinyint(4) NOT NULL,
  `PricePerMeter` int(11) NOT NULL,
  `TaxFree` tinyint(4) NOT NULL,
  `AllowDirectTeleport` tinyint(4) NOT NULL,
  `RedirectGridX` int(11) NOT NULL,
  `RedirectGridY` int(11) NOT NULL,
  `ParentEstateID` int(10) unsigned NOT NULL,
  `SunPosition` double NOT NULL,
  `EstateSkipScripts` tinyint(4) NOT NULL,
  `BillableFactor` float NOT NULL,
  `PublicAccess` tinyint(4) NOT NULL,
  `AbuseEmail` varchar(255) NOT NULL,
  `EstateOwner` varchar(36) NOT NULL,
  `DenyMinors` tinyint(4) NOT NULL,
  `AllowLandmark` tinyint(4) NOT NULL DEFAULT 1,
  `AllowParcelChanges` tinyint(4) NOT NULL DEFAULT 1,
  `AllowSetHome` tinyint(4) NOT NULL DEFAULT 1,
  `AllowEnviromentOverride` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`EstateID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `estate_users` (
  `EstateID` int(10) unsigned NOT NULL,
  `uuid` char(36) NOT NULL,
  KEY `EstateID` (`EstateID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `estateban` (
  `EstateID` int(10) unsigned NOT NULL,
  `bannedUUID` varchar(36) NOT NULL,
  `bannedIp` varchar(16) NOT NULL,
  `bannedIpHostMask` varchar(16) NOT NULL,
  `bannedNameMask` varchar(64) DEFAULT NULL,
  `banningUUID` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `banTime` int(11) NOT NULL DEFAULT 0,
  KEY `estateban_EstateID` (`EstateID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_offline` (
  `ID` mediumint(9) NOT NULL AUTO_INCREMENT,
  `PrincipalID` char(36) NOT NULL DEFAULT '',
  `FromID` char(36) NOT NULL DEFAULT '',
  `Message` text NOT NULL,
  `TMStamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `PrincipalID` (`PrincipalID`),
  KEY `FromID` (`FromID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventoryfolders` (
  `folderName` varchar(64) DEFAULT NULL,
  `type` smallint(6) NOT NULL DEFAULT 0,
  `version` int(11) NOT NULL DEFAULT 0,
  `folderID` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `agentID` char(36) DEFAULT NULL,
  `parentFolderID` char(36) DEFAULT NULL,
  PRIMARY KEY (`folderID`),
  KEY `inventoryfolders_agentid` (`agentID`),
  KEY `inventoryfolders_parentFolderid` (`parentFolderID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventoryitems` (
  `assetID` varchar(36) DEFAULT NULL,
  `assetType` int(11) DEFAULT NULL,
  `inventoryName` varchar(64) DEFAULT NULL,
  `inventoryDescription` varchar(128) DEFAULT NULL,
  `inventoryNextPermissions` int(10) unsigned DEFAULT NULL,
  `inventoryCurrentPermissions` int(10) unsigned DEFAULT NULL,
  `invType` int(11) DEFAULT NULL,
  `creatorID` varchar(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `inventoryBasePermissions` int(10) unsigned NOT NULL DEFAULT 0,
  `inventoryEveryOnePermissions` int(10) unsigned NOT NULL DEFAULT 0,
  `salePrice` int(11) NOT NULL DEFAULT 0,
  `saleType` tinyint(4) NOT NULL DEFAULT 0,
  `creationDate` int(11) NOT NULL DEFAULT 0,
  `groupID` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `groupOwned` tinyint(4) NOT NULL DEFAULT 0,
  `flags` int(11) unsigned NOT NULL DEFAULT 0,
  `inventoryID` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `avatarID` char(36) DEFAULT NULL,
  `parentFolderID` char(36) DEFAULT NULL,
  `inventoryGroupPermissions` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`inventoryID`),
  KEY `inventoryitems_avatarid` (`avatarID`),
  KEY `inventoryitems_parentFolderid` (`parentFolderID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `land` (
  `UUID` varchar(255) NOT NULL,
  `RegionUUID` varchar(255) DEFAULT NULL,
  `LocalLandID` int(11) DEFAULT NULL,
  `Bitmap` longblob DEFAULT NULL,
  `Name` varchar(255) DEFAULT NULL,
  `Description` varchar(255) DEFAULT NULL,
  `OwnerUUID` varchar(255) DEFAULT NULL,
  `IsGroupOwned` int(11) DEFAULT NULL,
  `Area` int(11) DEFAULT NULL,
  `AuctionID` int(11) DEFAULT NULL,
  `Category` int(11) DEFAULT NULL,
  `ClaimDate` int(11) DEFAULT NULL,
  `ClaimPrice` int(11) DEFAULT NULL,
  `GroupUUID` varchar(255) DEFAULT NULL,
  `SalePrice` int(11) DEFAULT NULL,
  `LandStatus` int(11) DEFAULT NULL,
  `LandFlags` int(10) unsigned DEFAULT NULL,
  `LandingType` int(11) DEFAULT NULL,
  `MediaAutoScale` int(11) DEFAULT NULL,
  `MediaTextureUUID` varchar(255) DEFAULT NULL,
  `MediaURL` varchar(255) DEFAULT NULL,
  `MusicURL` varchar(255) DEFAULT NULL,
  `PassHours` float DEFAULT NULL,
  `PassPrice` int(11) DEFAULT NULL,
  `SnapshotUUID` varchar(255) DEFAULT NULL,
  `UserLocationX` float DEFAULT NULL,
  `UserLocationY` float DEFAULT NULL,
  `UserLocationZ` float DEFAULT NULL,
  `UserLookAtX` float DEFAULT NULL,
  `UserLookAtY` float DEFAULT NULL,
  `UserLookAtZ` float DEFAULT NULL,
  `AuthbuyerID` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `OtherCleanTime` int(11) NOT NULL DEFAULT 0,
  `Dwell` int(11) NOT NULL DEFAULT 0,
  `MediaType` varchar(32) NOT NULL DEFAULT 'none/none',
  `MediaDescription` varchar(255) NOT NULL DEFAULT '',
  `MediaSize` varchar(16) NOT NULL DEFAULT '0,0',
  `MediaLoop` tinyint(1) NOT NULL DEFAULT 0,
  `ObscureMusic` tinyint(1) NOT NULL DEFAULT 0,
  `ObscureMedia` tinyint(1) NOT NULL DEFAULT 0,
  `SeeAVs` tinyint(4) NOT NULL DEFAULT 1,
  `AnyAVSounds` tinyint(4) NOT NULL DEFAULT 1,
  `GroupAVSounds` tinyint(4) NOT NULL DEFAULT 1,
  `environment` mediumtext DEFAULT NULL,
  PRIMARY KEY (`UUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `landaccesslist` (
  `LandUUID` varchar(255) DEFAULT NULL,
  `AccessUUID` varchar(255) DEFAULT NULL,
  `Flags` int(11) DEFAULT NULL,
  `Expires` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `name` varchar(100) DEFAULT NULL,
  `version` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_groups_groups` (
  `GroupID` char(36) NOT NULL DEFAULT '',
  `Location` varchar(255) NOT NULL DEFAULT '',
  `Name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `Charter` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `InsigniaID` char(36) NOT NULL DEFAULT '',
  `FounderID` char(36) NOT NULL DEFAULT '',
  `MembershipFee` int(11) NOT NULL DEFAULT 0,
  `OpenEnrollment` varchar(255) NOT NULL DEFAULT '',
  `ShowInList` int(4) NOT NULL DEFAULT 0,
  `AllowPublish` int(4) NOT NULL DEFAULT 0,
  `MaturePublish` int(4) NOT NULL DEFAULT 0,
  `OwnerRoleID` char(36) NOT NULL DEFAULT '',
  PRIMARY KEY (`GroupID`),
  UNIQUE KEY `Name` (`Name`),
  FULLTEXT KEY `Name_2` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_groups_invites` (
  `InviteID` char(36) NOT NULL DEFAULT '',
  `GroupID` char(36) NOT NULL DEFAULT '',
  `RoleID` char(36) NOT NULL DEFAULT '',
  `PrincipalID` varchar(255) NOT NULL DEFAULT '',
  `TMStamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`InviteID`),
  UNIQUE KEY `PrincipalGroup` (`GroupID`,`PrincipalID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_groups_membership` (
  `GroupID` char(36) NOT NULL DEFAULT '',
  `PrincipalID` varchar(255) NOT NULL DEFAULT '',
  `SelectedRoleID` char(36) NOT NULL DEFAULT '',
  `Contribution` int(11) NOT NULL DEFAULT 0,
  `ListInProfile` int(4) NOT NULL DEFAULT 1,
  `AcceptNotices` int(4) NOT NULL DEFAULT 1,
  `AccessToken` char(36) NOT NULL DEFAULT '',
  PRIMARY KEY (`GroupID`,`PrincipalID`),
  KEY `PrincipalID` (`PrincipalID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_groups_notices` (
  `GroupID` char(36) NOT NULL DEFAULT '',
  `NoticeID` char(36) NOT NULL DEFAULT '',
  `TMStamp` int(10) unsigned NOT NULL DEFAULT 0,
  `FromName` varchar(255) NOT NULL DEFAULT '',
  `Subject` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `Message` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `HasAttachment` int(4) NOT NULL DEFAULT 0,
  `AttachmentType` int(4) NOT NULL DEFAULT 0,
  `AttachmentName` varchar(128) NOT NULL DEFAULT '',
  `AttachmentItemID` char(36) NOT NULL DEFAULT '',
  `AttachmentOwnerID` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`NoticeID`),
  KEY `GroupID` (`GroupID`),
  KEY `TMStamp` (`TMStamp`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_groups_principals` (
  `PrincipalID` varchar(255) NOT NULL DEFAULT '',
  `ActiveGroupID` char(36) NOT NULL DEFAULT '',
  PRIMARY KEY (`PrincipalID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_groups_rolemembership` (
  `GroupID` char(36) NOT NULL DEFAULT '',
  `RoleID` char(36) NOT NULL DEFAULT '',
  `PrincipalID` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`GroupID`,`RoleID`,`PrincipalID`),
  KEY `PrincipalID` (`PrincipalID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_groups_roles` (
  `GroupID` char(36) NOT NULL DEFAULT '',
  `RoleID` char(36) NOT NULL DEFAULT '',
  `Name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `Description` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `Title` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `Powers` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`GroupID`,`RoleID`),
  KEY `GroupID` (`GroupID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `primitems` (
  `invType` int(11) DEFAULT NULL,
  `assetType` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `creationDate` bigint(20) DEFAULT NULL,
  `nextPermissions` int(11) DEFAULT NULL,
  `currentPermissions` int(11) DEFAULT NULL,
  `basePermissions` int(11) DEFAULT NULL,
  `everyonePermissions` int(11) DEFAULT NULL,
  `groupPermissions` int(11) DEFAULT NULL,
  `flags` int(11) NOT NULL DEFAULT 0,
  `itemID` char(36) NOT NULL DEFAULT '',
  `primID` char(36) DEFAULT NULL,
  `assetID` char(36) DEFAULT NULL,
  `parentFolderID` char(36) DEFAULT NULL,
  `CreatorID` varchar(255) NOT NULL DEFAULT '',
  `ownerID` char(36) DEFAULT NULL,
  `groupID` char(36) DEFAULT NULL,
  `lastOwnerID` char(36) DEFAULT NULL,
  PRIMARY KEY (`itemID`),
  KEY `primitems_primid` (`primID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `prims` (
  `CreationDate` int(11) DEFAULT NULL,
  `Name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `Text` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `Description` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `SitName` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `TouchName` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `ObjectFlags` int(11) DEFAULT NULL,
  `OwnerMask` int(11) DEFAULT NULL,
  `NextOwnerMask` int(11) DEFAULT NULL,
  `GroupMask` int(11) DEFAULT NULL,
  `EveryoneMask` int(11) DEFAULT NULL,
  `BaseMask` int(11) DEFAULT NULL,
  `PositionX` float DEFAULT 0,
  `PositionY` float DEFAULT 0,
  `PositionZ` float DEFAULT 0,
  `GroupPositionX` float DEFAULT 0,
  `GroupPositionY` float DEFAULT 0,
  `GroupPositionZ` float DEFAULT 0,
  `VelocityX` float DEFAULT 0,
  `VelocityY` float DEFAULT 0,
  `VelocityZ` float DEFAULT 0,
  `AngularVelocityX` float DEFAULT 0,
  `AngularVelocityY` float DEFAULT 0,
  `AngularVelocityZ` float DEFAULT 0,
  `AccelerationX` float DEFAULT 0,
  `AccelerationY` float DEFAULT 0,
  `AccelerationZ` float DEFAULT 0,
  `RotationX` float DEFAULT 0,
  `RotationY` float DEFAULT 0,
  `RotationZ` float DEFAULT 0,
  `RotationW` float DEFAULT 0,
  `SitTargetOffsetX` float DEFAULT 0,
  `SitTargetOffsetY` float DEFAULT 0,
  `SitTargetOffsetZ` float DEFAULT 0,
  `SitTargetOrientW` float DEFAULT 0,
  `SitTargetOrientX` float DEFAULT 0,
  `SitTargetOrientY` float DEFAULT 0,
  `SitTargetOrientZ` float DEFAULT 0,
  `UUID` char(36) NOT NULL DEFAULT '',
  `RegionUUID` char(36) DEFAULT NULL,
  `CreatorID` varchar(255) NOT NULL DEFAULT '',
  `OwnerID` char(36) DEFAULT NULL,
  `GroupID` char(36) DEFAULT NULL,
  `LastOwnerID` char(36) DEFAULT NULL,
  `SceneGroupID` char(36) DEFAULT NULL,
  `PayPrice` int(11) NOT NULL DEFAULT 0,
  `PayButton1` int(11) NOT NULL DEFAULT 0,
  `PayButton2` int(11) NOT NULL DEFAULT 0,
  `PayButton3` int(11) NOT NULL DEFAULT 0,
  `PayButton4` int(11) NOT NULL DEFAULT 0,
  `LoopedSound` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `LoopedSoundGain` float DEFAULT 0,
  `TextureAnimation` blob DEFAULT NULL,
  `OmegaX` float DEFAULT 0,
  `OmegaY` float DEFAULT 0,
  `OmegaZ` float DEFAULT 0,
  `CameraEyeOffsetX` float DEFAULT 0,
  `CameraEyeOffsetY` float DEFAULT 0,
  `CameraEyeOffsetZ` float DEFAULT 0,
  `CameraAtOffsetX` float DEFAULT 0,
  `CameraAtOffsetY` float DEFAULT 0,
  `CameraAtOffsetZ` float DEFAULT 0,
  `ForceMouselook` tinyint(4) NOT NULL DEFAULT 0,
  `ScriptAccessPin` int(11) NOT NULL DEFAULT 0,
  `AllowedDrop` tinyint(4) NOT NULL DEFAULT 0,
  `DieAtEdge` tinyint(4) NOT NULL DEFAULT 0,
  `SalePrice` int(11) NOT NULL DEFAULT 10,
  `SaleType` tinyint(4) NOT NULL DEFAULT 0,
  `ColorR` int(11) NOT NULL DEFAULT 0,
  `ColorG` int(11) NOT NULL DEFAULT 0,
  `ColorB` int(11) NOT NULL DEFAULT 0,
  `ColorA` int(11) NOT NULL DEFAULT 0,
  `ParticleSystem` blob DEFAULT NULL,
  `ClickAction` tinyint(4) NOT NULL DEFAULT 0,
  `Material` tinyint(4) NOT NULL DEFAULT 3,
  `CollisionSound` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `CollisionSoundVolume` double NOT NULL DEFAULT 0,
  `LinkNumber` int(11) NOT NULL DEFAULT 0,
  `PassTouches` tinyint(4) NOT NULL DEFAULT 0,
  `MediaURL` varchar(255) DEFAULT NULL,
  `DynAttrs` text DEFAULT NULL,
  `PhysicsShapeType` tinyint(4) NOT NULL DEFAULT 0,
  `Density` float DEFAULT 1000,
  `GravityModifier` float DEFAULT 1,
  `Friction` float DEFAULT 0.6,
  `Restitution` float DEFAULT 0.5,
  `KeyframeMotion` blob DEFAULT NULL,
  `AttachedPosX` float DEFAULT 0,
  `AttachedPosY` float DEFAULT 0,
  `AttachedPosZ` float DEFAULT 0,
  `PassCollisions` tinyint(4) NOT NULL DEFAULT 0,
  `Vehicle` text DEFAULT NULL,
  `RotationAxisLocks` tinyint(4) NOT NULL DEFAULT 0,
  `RezzerID` char(36) DEFAULT NULL,
  `PhysInertia` text DEFAULT NULL,
  `sopanims` blob DEFAULT NULL,
  `standtargetx` float DEFAULT 0,
  `standtargety` float DEFAULT 0,
  `standtargetz` float DEFAULT 0,
  `sitactrange` float DEFAULT 0,
  `pseudocrc` int(11) DEFAULT 0,
  `lnkstBinData` blob DEFAULT NULL,
  PRIMARY KEY (`UUID`),
  KEY `prims_regionuuid` (`RegionUUID`),
  KEY `prims_scenegroupid` (`SceneGroupID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `primshapes` (
  `Shape` int(11) DEFAULT NULL,
  `ScaleX` double NOT NULL DEFAULT 0,
  `ScaleY` double NOT NULL DEFAULT 0,
  `ScaleZ` double NOT NULL DEFAULT 0,
  `PCode` int(11) DEFAULT NULL,
  `PathBegin` int(11) DEFAULT NULL,
  `PathEnd` int(11) DEFAULT NULL,
  `PathScaleX` int(11) DEFAULT NULL,
  `PathScaleY` int(11) DEFAULT NULL,
  `PathShearX` int(11) DEFAULT NULL,
  `PathShearY` int(11) DEFAULT NULL,
  `PathSkew` int(11) DEFAULT NULL,
  `PathCurve` int(11) DEFAULT NULL,
  `PathRadiusOffset` int(11) DEFAULT NULL,
  `PathRevolutions` int(11) DEFAULT NULL,
  `PathTaperX` int(11) DEFAULT NULL,
  `PathTaperY` int(11) DEFAULT NULL,
  `PathTwist` int(11) DEFAULT NULL,
  `PathTwistBegin` int(11) DEFAULT NULL,
  `ProfileBegin` int(11) DEFAULT NULL,
  `ProfileEnd` int(11) DEFAULT NULL,
  `ProfileCurve` int(11) DEFAULT NULL,
  `ProfileHollow` int(11) DEFAULT NULL,
  `State` int(11) DEFAULT NULL,
  `Texture` longblob DEFAULT NULL,
  `ExtraParams` longblob DEFAULT NULL,
  `UUID` char(36) NOT NULL DEFAULT '',
  `Media` text DEFAULT NULL,
  `LastAttachPoint` int(4) NOT NULL DEFAULT 0,
  `MatOvrd` blob DEFAULT NULL,
  PRIMARY KEY (`UUID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `regionban` (
  `regionUUID` varchar(36) NOT NULL,
  `bannedUUID` varchar(36) NOT NULL,
  `bannedIp` varchar(16) NOT NULL,
  `bannedIpHostMask` varchar(16) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `regionenvironment` (
  `region_id` varchar(36) NOT NULL,
  `llsd_settings` mediumtext DEFAULT NULL,
  PRIMARY KEY (`region_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `regionextra` (
  `RegionID` char(36) NOT NULL,
  `Name` varchar(32) NOT NULL,
  `value` text DEFAULT NULL,
  PRIMARY KEY (`RegionID`,`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `regionsettings` (
  `regionUUID` char(36) NOT NULL,
  `block_terraform` int(11) NOT NULL,
  `block_fly` int(11) NOT NULL,
  `allow_damage` int(11) NOT NULL,
  `restrict_pushing` int(11) NOT NULL,
  `allow_land_resell` int(11) NOT NULL,
  `allow_land_join_divide` int(11) NOT NULL,
  `block_show_in_search` int(11) NOT NULL,
  `agent_limit` int(11) NOT NULL,
  `object_bonus` double NOT NULL,
  `maturity` int(11) NOT NULL,
  `disable_scripts` int(11) NOT NULL,
  `disable_collisions` int(11) NOT NULL,
  `disable_physics` int(11) NOT NULL,
  `terrain_texture_1` char(36) NOT NULL,
  `terrain_texture_2` char(36) NOT NULL,
  `terrain_texture_3` char(36) NOT NULL,
  `terrain_texture_4` char(36) NOT NULL,
  `elevation_1_nw` double NOT NULL,
  `elevation_2_nw` double NOT NULL,
  `elevation_1_ne` double NOT NULL,
  `elevation_2_ne` double NOT NULL,
  `elevation_1_se` double NOT NULL,
  `elevation_2_se` double NOT NULL,
  `elevation_1_sw` double NOT NULL,
  `elevation_2_sw` double NOT NULL,
  `water_height` double NOT NULL,
  `terrain_raise_limit` double NOT NULL,
  `terrain_lower_limit` double NOT NULL,
  `use_estate_sun` int(11) NOT NULL,
  `fixed_sun` int(11) NOT NULL,
  `sun_position` double NOT NULL,
  `covenant` char(36) DEFAULT NULL,
  `Sandbox` tinyint(4) NOT NULL,
  `sunvectorx` double NOT NULL DEFAULT 0,
  `sunvectory` double NOT NULL DEFAULT 0,
  `sunvectorz` double NOT NULL DEFAULT 0,
  `loaded_creation_id` varchar(64) DEFAULT NULL,
  `loaded_creation_datetime` int(10) unsigned NOT NULL DEFAULT 0,
  `map_tile_ID` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `TelehubObject` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `parcel_tile_ID` char(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `covenant_datetime` int(10) unsigned NOT NULL DEFAULT 0,
  `block_search` tinyint(4) NOT NULL DEFAULT 0,
  `casino` tinyint(4) NOT NULL DEFAULT 0,
  `cacheID` char(36) DEFAULT NULL,
  `TerrainPBR1` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `TerrainPBR2` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `TerrainPBR3` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `TerrainPBR4` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  PRIMARY KEY (`regionUUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `regionwindlight` (
  `region_id` varchar(36) NOT NULL DEFAULT '000000-0000-0000-0000-000000000000',
  `water_color_r` float(9,6) unsigned NOT NULL DEFAULT 4.000000,
  `water_color_g` float(9,6) unsigned NOT NULL DEFAULT 38.000000,
  `water_color_b` float(9,6) unsigned NOT NULL DEFAULT 64.000000,
  `water_fog_density_exponent` float(9,7) unsigned NOT NULL DEFAULT 4.0000000,
  `underwater_fog_modifier` float(9,8) unsigned NOT NULL DEFAULT 0.25000000,
  `reflection_wavelet_scale_1` float(9,7) unsigned NOT NULL DEFAULT 2.0000000,
  `reflection_wavelet_scale_2` float(9,7) unsigned NOT NULL DEFAULT 2.0000000,
  `reflection_wavelet_scale_3` float(9,7) unsigned NOT NULL DEFAULT 2.0000000,
  `fresnel_scale` float(9,8) unsigned NOT NULL DEFAULT 0.40000001,
  `fresnel_offset` float(9,8) unsigned NOT NULL DEFAULT 0.50000000,
  `refract_scale_above` float(9,8) unsigned NOT NULL DEFAULT 0.03000000,
  `refract_scale_below` float(9,8) unsigned NOT NULL DEFAULT 0.20000000,
  `blur_multiplier` float(9,8) unsigned NOT NULL DEFAULT 0.04000000,
  `big_wave_direction_x` float(9,8) NOT NULL DEFAULT 1.04999995,
  `big_wave_direction_y` float(9,8) NOT NULL DEFAULT -0.41999999,
  `little_wave_direction_x` float(9,8) NOT NULL DEFAULT 1.11000001,
  `little_wave_direction_y` float(9,8) NOT NULL DEFAULT -1.15999997,
  `normal_map_texture` varchar(36) NOT NULL DEFAULT '822ded49-9a6c-f61c-cb89-6df54f42cdf4',
  `horizon_r` float(9,8) unsigned NOT NULL DEFAULT 0.25000000,
  `horizon_g` float(9,8) unsigned NOT NULL DEFAULT 0.25000000,
  `horizon_b` float(9,8) unsigned NOT NULL DEFAULT 0.31999999,
  `horizon_i` float(9,8) unsigned NOT NULL DEFAULT 0.31999999,
  `haze_horizon` float(9,8) unsigned NOT NULL DEFAULT 0.19000000,
  `blue_density_r` float(9,8) unsigned NOT NULL DEFAULT 0.12000000,
  `blue_density_g` float(9,8) unsigned NOT NULL DEFAULT 0.22000000,
  `blue_density_b` float(9,8) unsigned NOT NULL DEFAULT 0.38000000,
  `blue_density_i` float(9,8) unsigned NOT NULL DEFAULT 0.38000000,
  `haze_density` float(9,8) unsigned NOT NULL DEFAULT 0.69999999,
  `density_multiplier` float(9,8) unsigned NOT NULL DEFAULT 0.18000001,
  `distance_multiplier` float(9,6) unsigned NOT NULL DEFAULT 0.800000,
  `max_altitude` int(4) unsigned NOT NULL DEFAULT 1605,
  `sun_moon_color_r` float(9,8) unsigned NOT NULL DEFAULT 0.23999999,
  `sun_moon_color_g` float(9,8) unsigned NOT NULL DEFAULT 0.25999999,
  `sun_moon_color_b` float(9,8) unsigned NOT NULL DEFAULT 0.30000001,
  `sun_moon_color_i` float(9,8) unsigned NOT NULL DEFAULT 0.30000001,
  `sun_moon_position` float(9,8) unsigned NOT NULL DEFAULT 0.31700000,
  `ambient_r` float(9,8) unsigned NOT NULL DEFAULT 0.34999999,
  `ambient_g` float(9,8) unsigned NOT NULL DEFAULT 0.34999999,
  `ambient_b` float(9,8) unsigned NOT NULL DEFAULT 0.34999999,
  `ambient_i` float(9,8) unsigned NOT NULL DEFAULT 0.34999999,
  `east_angle` float(9,8) unsigned NOT NULL DEFAULT 0.00000000,
  `sun_glow_focus` float(9,8) unsigned NOT NULL DEFAULT 0.10000000,
  `sun_glow_size` float(9,8) unsigned NOT NULL DEFAULT 1.75000000,
  `scene_gamma` float(9,7) unsigned NOT NULL DEFAULT 1.0000000,
  `star_brightness` float(9,8) unsigned NOT NULL DEFAULT 0.00000000,
  `cloud_color_r` float(9,8) unsigned NOT NULL DEFAULT 0.41000000,
  `cloud_color_g` float(9,8) unsigned NOT NULL DEFAULT 0.41000000,
  `cloud_color_b` float(9,8) unsigned NOT NULL DEFAULT 0.41000000,
  `cloud_color_i` float(9,8) unsigned NOT NULL DEFAULT 0.41000000,
  `cloud_x` float(9,8) unsigned NOT NULL DEFAULT 1.00000000,
  `cloud_y` float(9,8) unsigned NOT NULL DEFAULT 0.52999997,
  `cloud_density` float(9,8) unsigned NOT NULL DEFAULT 1.00000000,
  `cloud_coverage` float(9,8) unsigned NOT NULL DEFAULT 0.27000001,
  `cloud_scale` float(9,8) unsigned NOT NULL DEFAULT 0.41999999,
  `cloud_detail_x` float(9,8) unsigned NOT NULL DEFAULT 1.00000000,
  `cloud_detail_y` float(9,8) unsigned NOT NULL DEFAULT 0.52999997,
  `cloud_detail_density` float(9,8) unsigned NOT NULL DEFAULT 0.12000000,
  `cloud_scroll_x` float(9,7) NOT NULL DEFAULT 0.2000000,
  `cloud_scroll_x_lock` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `cloud_scroll_y` float(9,7) NOT NULL DEFAULT 0.0100000,
  `cloud_scroll_y_lock` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `draw_classic_clouds` tinyint(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`region_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `spawn_points` (
  `RegionID` varchar(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `Yaw` float NOT NULL,
  `Pitch` float NOT NULL,
  `Distance` float NOT NULL,
  KEY `RegionID` (`RegionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `terrain` (
  `RegionUUID` varchar(255) DEFAULT NULL,
  `Revision` int(11) DEFAULT NULL,
  `Heightfield` longblob DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `UUID` char(36) NOT NULL,
  `token` varchar(255) NOT NULL,
  `validity` datetime NOT NULL,
  UNIQUE KEY `uuid_token` (`UUID`,`token`),
  KEY `UUID` (`UUID`),
  KEY `token` (`token`),
  KEY `validity` (`validity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `userdata` (
  `UserId` char(36) NOT NULL,
  `TagId` varchar(64) NOT NULL,
  `DataKey` varchar(255) DEFAULT NULL,
  `DataVal` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`UserId`,`TagId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usernotes` (
  `useruuid` varchar(36) NOT NULL,
  `targetuuid` varchar(36) NOT NULL,
  `notes` text NOT NULL,
  UNIQUE KEY `useruuid` (`useruuid`,`targetuuid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `userpicks` (
  `pickuuid` varchar(36) NOT NULL,
  `creatoruuid` varchar(36) NOT NULL,
  `toppick` enum('true','false') NOT NULL,
  `parceluuid` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `snapshotuuid` varchar(36) NOT NULL,
  `user` varchar(255) NOT NULL,
  `originalname` varchar(255) NOT NULL,
  `simname` varchar(255) NOT NULL,
  `posglobal` varchar(255) NOT NULL,
  `sortorder` int(2) NOT NULL,
  `enabled` enum('true','false') NOT NULL,
  `gatekeeper` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`pickuuid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `userprofile` (
  `useruuid` varchar(36) NOT NULL,
  `profilePartner` varchar(36) NOT NULL,
  `profileAllowPublish` binary(1) NOT NULL,
  `profileMaturePublish` binary(1) NOT NULL,
  `profileURL` varchar(255) NOT NULL,
  `profileWantToMask` int(3) NOT NULL,
  `profileWantToText` text NOT NULL,
  `profileSkillsMask` int(3) NOT NULL,
  `profileSkillsText` text NOT NULL,
  `profileLanguages` text NOT NULL,
  `profileImage` varchar(36) NOT NULL,
  `profileAboutText` text NOT NULL,
  `profileFirstImage` varchar(36) NOT NULL,
  `profileFirstText` text NOT NULL,
  PRIMARY KEY (`useruuid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usersettings` (
  `useruuid` varchar(36) NOT NULL,
  `imviaemail` enum('true','false') NOT NULL,
  `visible` enum('true','false') NOT NULL,
  `email` varchar(254) NOT NULL,
  PRIMARY KEY (`useruuid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

