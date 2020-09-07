/* Read HDC1000 Temp/Humidity
 Keep the configuration register default.
 i2cget -y 1 0x41 0x02 w --> 0x0010 --> meaning Mode = 1 where Temp and Hum are acquired in sequence.
 Results are in the 0x00 and 0x01 registers
 Just read 4 bytes from 0x00 register. Bytes 1 and 2 = Temp. Bytes 3 and 4 = Humidity
 */

#include <stdlib.h>
#include <unistd.h>
#include <linux/i2c.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <fcntl.h>
#include <string.h>
#include <stdio.h>
#include <sys/time.h>

typedef struct{
    char rxBuffer[32];
    char txBuffer[32];
    int address;
    int tenBitAddress;
    int i2cHandle;
} i2cInfo;


int main(void)
{
    i2cInfo tempHum;
    i2cInfo* tempHumHandle = &tempHum;

    tempHumHandle->address = 0x41;
    tempHumHandle->tenBitAddress=0;


    // Create a file descriptor for the I2C bus
    tempHumHandle->i2cHandle = open("/dev/i2c-1", O_RDWR);


    // Tell the I2C peripheral that the device address is (or isn't) a 10-bit
    //   value. Most probably won't be.
    int opResult;
    opResult = ioctl(tempHumHandle->i2cHandle, I2C_TENBIT, tempHumHandle->tenBitAddress);


    // Clear our buffers
    memset(tempHumHandle->rxBuffer, 0, sizeof(tempHumHandle->rxBuffer));
    memset(tempHumHandle->txBuffer, 0, sizeof(tempHumHandle->txBuffer));

    struct timeval startOfWait;
    unsigned long startMs, endMs;



    ////////////////
    //READ FROM TEMP REGISTER, 0x00, ADDRESS OF HDCTEMPHUM
    //Initiate the register read.
    opResult = ioctl(tempHumHandle->i2cHandle, I2C_SLAVE, tempHumHandle->address);
    tempHumHandle->txBuffer[0] = 0x00; // register address
    opResult = write(tempHumHandle->i2cHandle, tempHumHandle->txBuffer, 1);

    //get start time and calculate end of wait

    gettimeofday(&startOfWait,NULL);
    startMs = startOfWait.tv_sec * 1000 + startOfWait.tv_usec / 1000;
    endMs = startMs + 1000;

    if (opResult != 1) printf("error\n");
    //WAIT 30ms. Or leave this and go do something else for 30ms or more


    return 0;
}
