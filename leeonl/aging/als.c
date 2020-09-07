#include <stdio.h>
#include <stdlib.h>

void main()
{
	char ch0[10];
	char ch1[10];
	char light[10];

	gets(ch0);
	gets(ch1);
	gets(light);
	int var_ch0 = atoi(ch0);
	int var_ch1 = atoi(ch1);
	float var_light = atof(light);
	if ((var_ch0>=0)&&(var_ch0<2100))
	{
		if ((var_ch1>=0)&&(var_ch1<277))
		{
			if ((var_light>=0)&&(var_light<1900))
			{
				printf("1\n");
			}
			else
			{
				printf("0\n");
			}
		}
		else
		{
			printf("0\n");
		}
	}
	else
	{
		printf("0\n");
	}
	printf("%d\n",var_ch0);
	printf("%d\n",var_ch1);
	printf("%f\n",var_light);
}
