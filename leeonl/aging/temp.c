#include <stdio.h>
#include <stdlib.h>

void main()
{
	char num[10];
	gets(num);
	float var = atof(num);
	if ((var>0)&&(var<100))
	{
		printf("1\n");
	}
	else
	{
		printf("0\n");
	}
}
