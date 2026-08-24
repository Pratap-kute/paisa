package utils

import (
	"context"
	"errors"
	"time"

	log "github.com/sirupsen/logrus"
	gormlogger "gorm.io/gorm/logger"
)

type GormLogrusLogger struct {
	SlowThreshold time.Duration
	LogLevel      gormlogger.LogLevel
}

func NewGormLogger() gormlogger.Interface {
	return &GormLogrusLogger{
		SlowThreshold: 200 * time.Millisecond,
		LogLevel:      gormlogger.Warn,
	}
}

func (l *GormLogrusLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	newlogger := *l
	newlogger.LogLevel = level
	return &newlogger
}

func (l *GormLogrusLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	if l.LogLevel >= gormlogger.Info {
		log.Infof(msg, data...)
	}
}

func (l *GormLogrusLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	if l.LogLevel >= gormlogger.Warn {
		log.Warnf(msg, data...)
	}
}

func (l *GormLogrusLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	if l.LogLevel >= gormlogger.Error {
		log.Errorf(msg, data...)
	}
}

func (l *GormLogrusLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	if l.LogLevel <= gormlogger.Silent {
		return
	}

	elapsed := time.Since(begin)
	switch {
	case err != nil && l.LogLevel >= gormlogger.Error && !errors.Is(err, gormlogger.ErrRecordNotFound):
		sql, rows := fc()
		log.WithFields(log.Fields{
			"elapsed": elapsed,
			"rows":    rows,
			"err":     err,
		}).Error(sql)
	case elapsed > l.SlowThreshold && l.SlowThreshold != 0 && l.LogLevel >= gormlogger.Warn:
		sql, rows := fc()
		log.WithFields(log.Fields{
			"elapsed": elapsed,
			"rows":    rows,
			"slow":    true,
		}).Warn(sql)
	case l.LogLevel >= gormlogger.Info:
		sql, rows := fc()
		log.WithFields(log.Fields{
			"elapsed": elapsed,
			"rows":    rows,
		}).Debug(sql)
	}
}
