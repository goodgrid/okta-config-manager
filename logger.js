import { createLogger, format, transports } from 'winston'


const { combine, splat, timestamp, printf } = format;


const timezoned = () => {
  return new Date().toLocaleString('nl-NL', {
      timeZone: 'Europe/Amsterdam'
  });
}

const myFormat = printf( ({ level, message, timestamp}) => {
  return `${timestamp} [${level}] : ${message} `  
});

const logger = createLogger({
  level: 'info',
  format: combine(
    format.colorize(),
    splat(),
    timestamp({format: timezoned}),
    myFormat
  ),
  transports: [
    new transports.Console({ level: 'debug' }),
    new transports.File({ filename: `okta-config-manager.log`, level: 'info' }),
    new transports.File({ filename: `okta-config-manager_error.log`, level: 'error' }),
  ]
})


export default logger
