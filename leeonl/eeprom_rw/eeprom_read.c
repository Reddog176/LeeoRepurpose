#include <stdlib.h>
#include <unistd.h>
#include <linux/i2c.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <fcntl.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>

#define EEPROMADDRESS 0x50 //EEPROM device address

int main(int argc, char *argv[])
{
  // Set up some variables that we'll use along the way
  static uint8_t rxBuffer[256];  // receive buffer
  static uint8_t txBuffer[256];  // transmit buffer
  int opResult = 0;   // for error checking of operations
  uint16_t reghi = 0, reglo = 0; // High and low byte of register address
  uint16_t numbytes = 0; // Number of bytes to read from EEPROM  
  uint16_t i;
  char *pch;

  if(argc != 4)
  {
    error(EXIT_FAILURE, 0, "Usage: eeprom_read <16-bit register address: e.g. \"0x0000\"> <number of bytes to read> <0 = string output, 1 = numeric output, 2 = hex output>");
  }

  // Get the high and low register address bytes from 16-bit address
  reghi = strtol(argv[1], &pch, 0);
  
  if(*pch != 0)
  {
    error(EXIT_FAILURE, 0, "Address is not numeric");
  }
  
  reglo = reghi & 0xFF;
  reghi = (reghi & 0xFF00) >> 8;

  // Get number of bytes to read from EEPROM
  numbytes = strtol(argv[2], &pch, 0);

  if(*pch != 0)
  {
    error(EXIT_FAILURE, 0, "Byte count is not numeric");
  }

  // printf("high byte: %d, low byte: %d\n", reghi, reglo);  
    
  // Create a file descriptor for the I2C bus
  int i2cHandle = open("/dev/i2c-1", O_RDWR);
  
  // Tell the I2C peripheral that the device address is (or isn't) a 10-bit
  // value. Most probably won't be.
  opResult = ioctl(i2cHandle, I2C_TENBIT, 0);
  
  // READ FROM REGISTER ADDRESS OF EEPROM
  opResult = ioctl(i2cHandle, I2C_SLAVE, EEPROMADDRESS);
  txBuffer[0] = reghi; // High byte of register address
  txBuffer[1] = reglo; // Low byte of register address
  opResult = write(i2cHandle, txBuffer, 2);
  if (opResult != 2) error(EXIT_FAILURE, 0, "No ACK bit!\n");
  opResult = read(i2cHandle, rxBuffer, numbytes);
  
  switch(strtol(argv[3], NULL, 0))
  {
  case 2:
    printf("%02X", rxBuffer[i]);
    for(i = 1; i < numbytes; i++)
    {
      printf(" %02X", rxBuffer[i]);
    }
    break;
  case 1:
    printf("%d", rxBuffer[i]);
    for(i = 1; i < numbytes; i++)
    {
      printf(" %d", rxBuffer[i]);
    }
    break;
  case 0:
    for(i = 0; i < numbytes; i++)
    {
      printf("%c", rxBuffer[i]);
    }
    break;
  }
  return(0);
}  
  
  

