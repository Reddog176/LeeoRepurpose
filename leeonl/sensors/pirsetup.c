#include <stdlib.h>
#include <unistd.h>
#include <linux/i2c.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <fcntl.h>
#include <string.h>
#include <stdio.h>

int main(void)
{
    // Set up some variables that we'll use along the way
    char rxBuffer[32];  // receive buffer
    char txBuffer[32];  // transmit buffer
    int PIRAddress = 0x35; //AMS PIR device address
    int tenBitAddress = 0;  // is the device's address 10-bit? Usually not.
    int opResult = 0;   // for error checking of operations
    
    // Create a file descriptor for the I2C bus
    int i2cHandle = open("/dev/i2c-1", O_RDWR);
    
    
    // Tell the I2C peripheral that the device address is (or isn't) a 10-bit
    //   value. Most probably won't be.
    opResult = ioctl(i2cHandle, I2C_TENBIT, tenBitAddress);
    
    
    // Clear our buffers
    memset(rxBuffer, 0, sizeof(rxBuffer));
    memset(txBuffer, 0, sizeof(txBuffer));
    
    
    unsigned int integration_time_ms = 40;
    
    //WRITE TO STATUS REGISTER ADDRESS OF PIR
    opResult = ioctl(i2cHandle, I2C_SLAVE, PIRAddress);
    txBuffer[0] = 0x03;  // Set Status Register
    txBuffer[1] = 0x0F;  // Byte 1, Channel on/off: 0000 1111. Turn on Ch3210
    txBuffer[2] = 0x01;  // Byte 2, FE Power: High Power Mode
    txBuffer[3] = 0x20; // Byte 3, Chopping: 0010 0000 = 0x40
    txBuffer[4] = integration_time_ms; // Byte 4, Integration time. 0x00 = 1ms
    txBuffer[5] = 0x00; // Byte 5, Low Wake Up Threshold
    txBuffer[6] = 0x00; // Byte 6, High Wake Up Threshold
    txBuffer[7] = 0x00; // Byte 7, Wake Up Time
    txBuffer[8] = PIRAddress; // Byte 8, I2C Address 0011 0101 = 0x35
    txBuffer[9] = 0x00; // Byte 9, FIFO Status
    opResult = write(i2cHandle, txBuffer, 10);
    if (opResult != 10) printf("No ACK bit!\n");
    printf("Printed to EEPROM\n");
    
    //WAIT FOR 64 * integration_time
    //delay(64*(integration_time_ms+1));
    // sleep(64*(integration_time_ms+1));
    sleep(3);
    
    //WRITE TO STATUS REGISTER ADDRESS OF PIR
    opResult = ioctl(i2cHandle, I2C_SLAVE, PIRAddress);
    txBuffer[0] = 0x03;  // Set Status Register
    txBuffer[1] = 0x2F;  // Byte 1, Channel on/off: 0000 1111. Turn on Ch3210
    txBuffer[2] = 0x01;  // Byte 2, FE Power: High Power Mode
    txBuffer[3] = 0x20; // Byte 3, Chopping: 0010 0000 = 0x40
    txBuffer[4] = integration_time_ms; // Byte 4, Integration time. 0x00 = 1ms
    txBuffer[5] = 0x00; // Byte 5, Low Wake Up Threshold
    txBuffer[6] = 0x00; // Byte 6, High Wake Up Threshold
    txBuffer[7] = 0x00; // Byte 7, Wake Up Time
    txBuffer[8] = PIRAddress; // Byte 8, I2C Address 0011 0101 = 0x35
    txBuffer[9] = 0x00; // Byte 9, FIFO Status
    opResult = write(i2cHandle, txBuffer, 10);
    if (opResult != 10) printf("No ACK bit!\n");
    printf("Printed to EEPROM\n");
    
    //WAIT FOR 64 * integration_time
    //delay(64*(integration_time_ms+1));
    //sleep(64*(integration_time_ms+1));
    sleep(3);
    // Clear our buffers
    //memset(rxBuffer, 0, sizeof(rxBuffer));
    //memset(txBuffer, 0, sizeof(txBuffer));
    
    
    
    //READ FROM STATUS REGISTER ADDRESS OF PIR
    opResult = ioctl(i2cHandle, I2C_SLAVE, PIRAddress);
    txBuffer[0] = 0x02; // High byte of register address
    opResult = write(i2cHandle, txBuffer, 1);
    if (opResult != 1) printf("No ACK bit!\n");
    opResult = read(i2cHandle, rxBuffer, 11);
    printf("Status: %x, %x, %x, %x, %x, %x, %x, %x, %x, %x, %x\n", (int)rxBuffer[0], (int)rxBuffer[1], (int)rxBuffer[2], (int)rxBuffer[3], (int)rxBuffer[4], (int)rxBuffer[5], (int)rxBuffer[6], (int)rxBuffer[7], (int)rxBuffer[8], (int)rxBuffer[9], (int)rxBuffer[10]);
    
    
}
