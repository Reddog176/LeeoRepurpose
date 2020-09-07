#include <stdlib.h>
#include <unistd.h>
#include <linux/i2c.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <fcntl.h>
#include <string.h>
#include <stdio.h>

/*
int py_algorithm(int *newData)
{
	int tempchar = 0;
	int hpfData[4] = {0,0,0,0};
	int lpfData[4] = {0,0,0,0};

	hpf(newData,hpfData);
	lpf(hpfData,lpfData);

	tempchar = proxi_Algorithm();

	return tempchar;
}
*/

int DecValue(char lsb, char msb)
{
	int dec_var = 0;	
	int neg_bit = 0;

	int lsb_value = (int)lsb;
	int msb_value = (int)msb;

	msb_value &= 0x3F;

	dec_var = ((msb_value<<8)+lsb_value);
	neg_bit = (dec_var&0x2000)>>13;


	if (neg_bit==1)
	{
		dec_var = ((~dec_var)&0x3FFF)+1;
		dec_var = -dec_var;
	}
	else
	{
		dec_var &= 0x1FFF;		
	}

	return dec_var;
}


int main(void)
{
    // Set up some variables that we'll use along the way
    char rxBuffer[32];  // receive buffer
    char txBuffer[32];  // transmit buffer
    int PIRAddress = 0x35; //AMS PIR device address
    int tenBitAddress = 0;  // is the device's address 10-bit? Usually not.
    int opResult = 0;   // for error checking of operations
    int count_num_prev=0;
    
    // Create a file descriptor for the I2C bus
    int i2cHandle = open("/dev/i2c-1", O_RDWR);
    
    
    // Tell the I2C peripheral that the device address is (or isn't) a 10-bit
    //   value. Most probably won't be.
    opResult = ioctl(i2cHandle, I2C_TENBIT, tenBitAddress);
    
    
        // Clear our buffers
        memset(rxBuffer, 0, sizeof(rxBuffer));
        memset(txBuffer, 0, sizeof(txBuffer));
        
        
        //READ FROM STATUS REGISTER ADDRESS OF PIR
        opResult = ioctl(i2cHandle, I2C_SLAVE, PIRAddress);
        txBuffer[0] = 0x04; // High byte of register address
        opResult = write(i2cHandle, txBuffer, 1);
        if (opResult != 1) printf("No ACK bit!\n");
        opResult = read(i2cHandle, rxBuffer, 13);
	
	// The Count number should be recorded in case the same status is recorded multiply.
	
	if ((int)rxBuffer[11]!=count_num_prev)
	{
        printf("%d, %d, %d, %d, %d\n", DecValue(rxBuffer[1],rxBuffer[2]), DecValue(rxBuffer[3],rxBuffer[4]), DecValue(rxBuffer[5],rxBuffer[6]), DecValue(rxBuffer[7],rxBuffer[8]), DecValue(rxBuffer[9],rxBuffer[10]));
	}

	count_num_prev=(int)rxBuffer[11];

    
}
