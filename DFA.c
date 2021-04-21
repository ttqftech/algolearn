/*

     ========================================================

                        词法分析器V1.0

         (DFA，C语言描述，可分析C/C++词法)

                       Author:Estrong

                          2012.05.10 

    ========================================================

*/

 

/*

说明：

    标识符(Identifier):变量名和函数名(字母或下划线开头)；

    关键字(Keyword):具有特定的功能系统保留字，不能移作他用；

    运算符(Operator):   + - * / % = == != < <= > >= 等；

    分隔符(Separator):  , ; . ' " ( ) [ ] { } // /米 米/ #等；

    常量(Constant):字符串或字符常量；

    注释(Note): 注释不参与编译。

*/

#include "stdio.h"

#include "string.h"

 

#define MAX_STR 256

#define MAX_KEYWORDS 62

#define MAX_OPERATORS 12

#define MAX_SEPARATORS 15

 

/* 定义分析状态 */

#define STA_START 1

#define STA_IDorKEYWORD 2 /*   IDENTIFIER： 标识符   */

#define STA_NUMBER 3      /*   NUMBER：     数字     */

#define STA_NOTE 4        /*   NOTE:        注释     */

#define STA_CONSTANT 5    /*   CONSTANT:    常量     */

#define STA_DONE  6       /*   DONE：       完成     */

 

/* 定义所属类型 */

#define TYPE_KEYWORD 1    /*   KEYWORD：    保留字   */

#define TYPE_IDENTIFIER 2 /*   IDENTIFIER： 标识符   */

#define TYPE_NUMBER 3     /*   NUMBER：     数字     */

#define TYPE_NOTE 4       /*   NOTE:        注释     */

#define TYPE_CONSTANT 5   /*   CONSTANT:    常量     */

#define TYPE_OPERATOR 6   /*   OPERATOR:    运算符   */

#define TYPE_SEPARATOR 7  /*   SEPARATOR:   分隔符   */

#define TYPE_ERROR 8      /*   ERROR:       错误     */

#define TYPE_UNKNOWN 9    /*   UNKNOWN:     未知     */

#define TYPE_ENDFILE 10   /*   ENDFILE:     文件结束 */

 

char *Operators[MAX_OPERATORS] = {"+","-","*","/","%","=","==","!=","<","<=",">",">="};

char *Separators[MAX_SEPARATORS] ={",",";",".","\'","\"","(",")","[","]","{","}","//","/*","*/","#"};

char *Keywords[MAX_KEYWORDS] = {"include","define","auto","bool","break","case","catch","char","class",

                                "const","const_cast","continue","default","delete","do","double",

                                "dynamic_cast","else","enum","explicit","extern","false","float","for",

                                "friend","goto","if","inline","int","long","mutable","namespace","new",

                                "operator","private","protected","public","register","reinterpret_cast",

                                "return","short","signed","sizeof","static","static_cast","struct",

                                "switch","template","this","throw","true","try","typedef","typeid",

                                "typename","union","unsigned","using","virtual","void","volatile","while"};

 

/* 是否为运算符 */

int IsOperator(char c)

{
    int i;

    for(i=0;i<MAX_OPERATORS;i++)

        if(Operators[i][0]==c)

            return 1;

    return 0;

}

 

/* 是否为分隔符 */

int IsSeparator(char c)

{
    int i;

    for(i=0;i<MAX_SEPARATORS;i++)

        if(Separators[i][0]==c)

            return 1;

    return 0;

}

 

/* 是否为保留字 */

int IsKeyword(char *str)

{
    int i;

    for(i=0;i<MAX_KEYWORDS;i++)

        if(strcmp(Keywords[i],str)==0)

            return 1;

    return 0;

}

 

/* DONE一次输出一次 */

void OutputOneDone(FILE *outf,int type,char *str)

{
    if(IsKeyword(str)==1) type=TYPE_KEYWORD;

    switch(type)

    {
        case TYPE_KEYWORD:    fprintf(outf,"       KEYWORD:     ");break;

        case TYPE_IDENTIFIER: fprintf(outf,"       IDENTIFIER:  ");break;

        case TYPE_NUMBER:     fprintf(outf,"       NUMBER:      ");break;

        case TYPE_NOTE:       fprintf(outf,"       NOTE:        ");break;

        case TYPE_CONSTANT:   fprintf(outf,"       CONSTANT:    ");break;

        case TYPE_OPERATOR:   fprintf(outf,"       OPERATOR:    ");break;

        case TYPE_SEPARATOR:  fprintf(outf,"       SEPARATOR:   ");break;

        case TYPE_ERROR:      fprintf(outf,"       ERROR:       ");break;

        case TYPE_UNKNOWN:    fprintf(outf,"       UNKNOWN:     ");break;

        default:break;

    }

    fprintf(outf,"%s\n",str);

}

 

/* DFA词法分析函数 */

void LexAnalyse(FILE *inf,FILE *outf)

{
   char c;

   char str[MAX_STR];/* 过程字符串 */

   int i;

   int line_no=1;/* 行号 */

   int state,type;

   char flag_limit_one_line;/* 标志为 / * 注释 范围是一行 */

   char flag_had_got_dot;/* 用于限定小数中只能有一个小数点 */

   fprintf(outf,"Line %d--------------------------------------\n",line_no);

   while(!feof(inf))

   {
        i=0;

        state=STA_START;

        flag_limit_one_line=0;

        flag_had_got_dot=0;

        while(state!=STA_DONE)

        {
            c=fgetc(inf);

            switch(state)

            {
                case STA_START:

                                if( c==' ' || c=='\t');

                                else if(c=='\n')

                                {
                                    line_no++;

                                    fprintf(outf,"Line %d--------------------------------------\n",line_no);

                                }

                                else if( (c>='a' && c<='z') || (c>='A' && c<='Z') || c=='_')

                                {
                                    state=STA_IDorKEYWORD;

                                    type=TYPE_IDENTIFIER;

                                    str[i]=c; i++;

                                }

                                else if(c>='0' && c<='9')

                                {
                                    state=STA_NUMBER;

                                    type=TYPE_NUMBER;

                                    str[i]=c; i++;

                                }

                                else if(c=='/')

                                {
                                    str[i]=c; i++;

                                    c=fgetc(inf);

                                    if(c=='/')   /*   //注释    */

                                    {
                                        flag_limit_one_line=1;

                                        state=STA_NOTE;

                                        type=TYPE_NOTE;

                                        str[i]=c; i++;

 

                                    }

                                    else if(c=='*')       /*   / * 注释开始    */

                                    {
                                        state=STA_NOTE;

                                        type=TYPE_NOTE;

                                        str[i]=c; i++;

                                    }

                                    else

                                    {
                                        state=STA_DONE;

                                        type=TYPE_OPERATOR;

                                        fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                        i=1;/* str[1]='\0'; */

                                    }

                                }

                                else if(c=='<' || c=='>')

                                {
                                    state=STA_DONE;

                                    type=TYPE_OPERATOR;

                                    str[0]=c;

                                    c=fgetc(inf);

                                    if(c=='=')

                                    {
                                        str[1]='=';i=2;/* str[2]='\0'    */

                                    }

                                    else/* 暂未考虑<<,>>位移运算符的识别 */

                                    {
                                        fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                        i=1;/* str[1]='\0'; */

                                    }

                                }

                                else if(c=='!')

                                {
                                    state=STA_DONE;

                                    str[0]=c;

                                    c=fgetc(inf);

                                    if(c=='=')  /*    是!= */

                                    {
                                        type=TYPE_OPERATOR;

                                        str[1]='=';i=2;/* str[2]='\0'    */

                                    }

                                    else        /*    非!= */

                                    {
                                        type=TYPE_UNKNOWN;

                                        fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                        i=1;/* str[1]='\0'; */

                                    }

                                }

                                else if(c=='\"' || c=='\'')

                                {
                                    state=STA_CONSTANT;

                                    type=TYPE_CONSTANT;

                                    str[0]=c; i=1;

                                }

                                else if(IsOperator(c))

                                {
                                    state=STA_DONE;

                                    type=TYPE_OPERATOR;

                                    str[0]=c; i=1;/* str[1]='\0'; */

                                }

                                else if(IsSeparator(c))

                                {
                                    state=STA_DONE;

                                    type=TYPE_SEPARATOR;

                                    str[0]=c; i=1;/* str[1]='\0'; */

                                }

                                else if(c==EOF)

                                {
                                    state=STA_DONE;

                                    type=TYPE_ENDFILE;

                                }

                                else

                                {
                                    state=STA_DONE;

                                    type=TYPE_UNKNOWN;

                                }

                                break;/* case STA */

                case STA_IDorKEYWORD:

                                if((c>='a' && c<='z') || (c>='A' && c<='Z') || (c>='0' && c<='9') || c=='_' )

                                {
                                    str[i]=c; i++;

                                }

                                else if(c=='.')

                                {
                                    str[i]=c; i++;

                                    c=fgetc(inf);

                                    if((c>='a' && c<='z') || (c>='A' && c<='Z') || c=='_')

                                    {
                                        str[i]=c; i++;

                                        /* type=TYPE_IDENTIFIER;     */

                                    }

                                    else if(c==' ' || c=='\t' || c=='\n' || IsOperator(c) || IsSeparator(c))

                                    {
                                        fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                        state=STA_DONE;

                                        type=TYPE_ERROR;         /*  如 date. 或 date.1 标记为ERROR类型 */

                                    }

                                    else

                                    {
                                        str[i]=c; i++;

                                        type=TYPE_ERROR;

                                    }

                                }

                                else if(c==' ' || c=='\t' || c=='\n' || IsOperator(c) || IsSeparator(c))

                                {
                                    state=STA_DONE;

                                    fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                }

                                else

                                {
                                    state=STA_DONE;

                                    type=TYPE_ERROR;

                                }

                                break;/* case STA */

                case STA_NUMBER:

                                if(c>='0' && c<='9')

                                {
                                    str[i]=c; i++;

                                }

                                else if(c=='.')   /* 小数识别  */

                                {
                                    str[i]=c; i++;

                                    c=fgetc(inf);

                                    if(flag_had_got_dot==0)

                                    {
                                    if(c>='0' && c<='9')

                                    {
                                        str[i]=c; i++;

                                        /* type=TYPE_NUMBER; */

                                        flag_had_got_dot=1;

                                    }

                                    else /* if(c==' ' || c=='\t' || c=='\n' || c>='0' && c<='9' || ...) */

                                    {
                                        fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                        state=STA_DONE;

                                        type=TYPE_ERROR;         /*  如 date. 或 date.1 标记为ERROR类型 */

                                    }

                                    }

                                    else

                                    {
                                        type=TYPE_ERROR;

                                        str[i]=c; i++;

                                    }

                                }

                                else if(c==' ' || c=='\t' || c=='\n' || IsOperator(c) || IsSeparator(c))

                                {
                                    state=STA_DONE;

                                    fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                }

                                else

                                {
                                    str[i]=c; i++;

                                    type=TYPE_ERROR;

                                }

                                break;/* case STA */

                case STA_NOTE:

                                if(flag_limit_one_line==1)   /*      是/ * 注释, 限定一行 */

                                {
                                    if(c=='\n')

                                    {
                                        state=STA_DONE;

                                        fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节 */

                                    }

                                    else

                                    {
                                        str[i]=c; i++;

                                    }

                                }

                                else /*      是  / *   注释 */

                                {
                                    if(feof(inf))

                                    {
                                        state=STA_DONE;

                                        type=TYPE_ERROR;

                                    }

                                    else if(c=='\n')

                                    {
                                        line_no++;

                                        str[i]=c; i++;

                                    }

                                    else if(c=='*')

                                    {
                                        str[i]=c; i++;

                                        c=fgetc(inf);

                                        if(c=='/')

                                        {
                                            state=STA_DONE;

                                            str[i]=c; i++;

                                        }

                                        else

                                        {
                                            if(feof(inf))

                                            {
                                                state=STA_DONE;

                                                type=TYPE_ERROR;

                                            }

                                            fseek(inf, -1, SEEK_CUR);/* 文件流指针前移1个字节  */

                                        }

                                    }

                                    else

                                    {
                                        str[i]=c; i++;

                                    }

                                }

                                break;/* case STA */

                case STA_CONSTANT:

                                    if(feof(inf))

                                    {
                                        state=STA_DONE;

                                        type=TYPE_ERROR;

                                    }

                                    else if(c=='\n')

                                    {
                                        line_no++;

                                        str[i]=c; i++;

                                    }

                                    else if(c=='\"' || c=='\'')

                                    {
                                        state=STA_DONE;

                                        str[i]=c; i++;

                                    }

                                    else if(c=='\\')

                                    {
                                        str[i]=c; i++;

                                        c=fgetc(inf);

                                        str[i]=c; i++;

                                    }

                                    else

                                    {
                                        str[i]=c; i++;

                                    }

                                    break;/* case STA */

                case STA_DONE:  break;/* case STA */

                default:        break;/* case STA */

            }

        }/* state=STA_DONE */

        str[i]='\0';

        OutputOneDone(outf,type,str);/* DONE一次输出一次 */

   }/* feof(inf) */

}

 

/* 主函数 */

main()

{
    FILE *input,*output;

    if((input=fopen("input.c","r"))==NULL)

    {
        printf("Cannot find the file!\nStrike any key to exit!\n");

        system("pause");

        exit(1);

    }

    else

    {
        output=fopen("output.c","w");

        LexAnalyse(input,output);

        fprintf(output,"----------------------------------------------END OF FILE!\n");

        fclose(input);

        fclose(output);

        printf("Lexical Analyzer has finished the analyzation!\nFor more information please see the file output.txt.\n");

        system("pause");

    }

}