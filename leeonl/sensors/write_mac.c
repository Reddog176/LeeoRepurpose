#include <stdio.h>
#include <stdlib.h>


void main(int args,char *argv[])
{
	FILE *fp = fopen("mac.txt","wt");
	int size = 0;
	char *mac = argv[1];
	while(mac[size]!='\0')
	{
		size++;
	}	
	fwrite(mac,sizeof(char),size,fp);
	fclose(fp);
}
