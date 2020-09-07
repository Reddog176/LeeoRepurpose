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
    // Set up some variables that we'll use along the way

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


    ioctl(tempHumHandle->i2cHandle, I2C_SLAVE, tempHumHandle->address);
    tempHumHandle->txBuffer[0] = 0x00; // register address

    int res = read(tempHumHandle->i2cHandle, tempHumHandle->rxBuffer, 5);


    unsigned int resultTemp;
    resultTemp = (int)tempHumHandle->rxBuffer[0] << 8;
    resultTemp += (int)tempHumHandle->rxBuffer[1];
    //printf("%x\n", resultTemp);

    double temp;
    temp = resultTemp/65536.0 * 165 - 40;
    printf("%f\n", temp);

    /*
     //Test Low Resolution Method. It works!
     double tempTwo;
     tempTwo = (((int)rxBuffer[0]*256.0*165.0)/65536.0) - 40;
     printf("%f\n", tempTwo);
     */

    //////////////////////////

    //GET HUMIDITY READING FROM HUMIDITY REGISTER, 0x01

    unsigned int resultHum;
    resultHum = (int)tempHumHandle->rxBuffer[2] << 8;
    resultHum += (int)tempHumHandle->rxBuffer[3];
    //    printf("%x\n", resultHum);
    double hum;
    hum = (resultHum*100.0)/65536.0;
    printf("%f\n", hum);

    return 0;
}
