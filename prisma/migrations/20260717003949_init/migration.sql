BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[energy_consumption] (
    [id] INT NOT NULL IDENTITY(1,1),
    [timestamp] DATETIME2 NOT NULL,
    [building_id] NVARCHAR(1000) NOT NULL,
    [floor] INT NOT NULL,
    [zone] NVARCHAR(1000) NOT NULL,
    [device_type] NVARCHAR(1000) NOT NULL,
    [device_id] NVARCHAR(1000) NOT NULL,
    [energy_kwh] FLOAT(53) NOT NULL,
    [power_kw] FLOAT(53) NOT NULL,
    [voltage_v] FLOAT(53) NOT NULL,
    [current_a] FLOAT(53) NOT NULL,
    [power_factor] FLOAT(53) NOT NULL,
    [cost_usd] FLOAT(53) NOT NULL,
    [source_system] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [energy_consumption_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[hvac_performance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [timestamp] DATETIME2 NOT NULL,
    [building_id] NVARCHAR(1000) NOT NULL,
    [floor] INT NOT NULL,
    [zone] NVARCHAR(1000) NOT NULL,
    [unit_id] NVARCHAR(1000) NOT NULL,
    [mode] NVARCHAR(1000) NOT NULL,
    [setpoint_temp_c] FLOAT(53) NOT NULL,
    [actual_temp_c] FLOAT(53) NOT NULL,
    [outdoor_temp_c] FLOAT(53) NOT NULL,
    [humidity_percent] FLOAT(53) NOT NULL,
    [airflow_m3h] FLOAT(53) NOT NULL,
    [filter_status_percent] FLOAT(53) NOT NULL,
    [compressor_hours] FLOAT(53) NOT NULL,
    [energy_efficiency_ratio] FLOAT(53) NOT NULL,
    [operating_status] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [hvac_performance_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[occupancy] (
    [id] INT NOT NULL IDENTITY(1,1),
    [timestamp] DATETIME2 NOT NULL,
    [building_id] NVARCHAR(1000) NOT NULL,
    [floor] INT NOT NULL,
    [zone] NVARCHAR(1000) NOT NULL,
    [zone_capacity] INT NOT NULL,
    [person_count] INT NOT NULL,
    [occupancy_rate_percent] FLOAT(53) NOT NULL,
    [co2_ppm] INT NOT NULL,
    [temperature_c] FLOAT(53) NOT NULL,
    [humidity_percent] FLOAT(53) NOT NULL,
    [air_quality_index] INT NOT NULL,
    [entry_count] INT NOT NULL,
    [exit_count] INT NOT NULL,
    CONSTRAINT [occupancy_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[alerts_events] (
    [id] INT NOT NULL IDENTITY(1,1),
    [timestamp] DATETIME2 NOT NULL,
    [building_id] NVARCHAR(1000) NOT NULL,
    [floor] INT NOT NULL,
    [zone] NVARCHAR(1000) NOT NULL,
    [alert_id] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [device_id] NVARCHAR(1000),
    [alarm_type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [value] FLOAT(53) NOT NULL,
    [threshold] FLOAT(53) NOT NULL,
    [unit] NVARCHAR(1000) NOT NULL,
    [duration_minutes] INT NOT NULL,
    [resolved_at] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL,
    [acknowledged_by] NVARCHAR(1000),
    CONSTRAINT [alerts_events_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [energy_consumption_building_id_floor_zone_timestamp_idx] ON [dbo].[energy_consumption]([building_id], [floor], [zone], [timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [energy_consumption_device_id_idx] ON [dbo].[energy_consumption]([device_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [energy_consumption_timestamp_idx] ON [dbo].[energy_consumption]([timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [hvac_performance_building_id_floor_zone_timestamp_idx] ON [dbo].[hvac_performance]([building_id], [floor], [zone], [timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [hvac_performance_unit_id_idx] ON [dbo].[hvac_performance]([unit_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [hvac_performance_timestamp_idx] ON [dbo].[hvac_performance]([timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [occupancy_building_id_floor_zone_timestamp_idx] ON [dbo].[occupancy]([building_id], [floor], [zone], [timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [occupancy_building_id_floor_timestamp_idx] ON [dbo].[occupancy]([building_id], [floor], [timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [occupancy_timestamp_idx] ON [dbo].[occupancy]([timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alerts_events_building_id_floor_zone_timestamp_idx] ON [dbo].[alerts_events]([building_id], [floor], [zone], [timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alerts_events_severity_idx] ON [dbo].[alerts_events]([severity]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alerts_events_category_idx] ON [dbo].[alerts_events]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alerts_events_status_idx] ON [dbo].[alerts_events]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alerts_events_device_id_idx] ON [dbo].[alerts_events]([device_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alerts_events_timestamp_idx] ON [dbo].[alerts_events]([timestamp]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
