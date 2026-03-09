ALTER TABLE `ai_models` ADD COLUMN `name` varchar(255) NOT NULL DEFAULT '' COMMENT 'model name' after model_id;
