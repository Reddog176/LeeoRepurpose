#include <stdio.h>
#include <stdlib.h>

long size(char *filename)
{
	FILE *fp;
	fp = fopen(filename,"rt");
	fseek(fp,0,SEEK_END);
	long filelength = ftell(fp);
	fclose(fp);
	filelength = filelength / sizeof(char);
	return filelength;
}

void main(int argc, char *argv[])
{
	long filelength = size(argv[1]);
	char content[filelength];
	FILE *fp;
	fp = fopen(argv[1],"rt");
	fread(content,sizeof(char),filelength,fp);
	fclose(fp);
	fp = fopen("mac_test.txt","wt");
	fwrite(content,sizeof(char),filelength,fp);
	fclose(fp);
		
}
