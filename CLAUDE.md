This is a personal project which is meant to keep track of and organized a bunch of serialized stories online. These include mangas, manwhas, and webnovels.
It is mainly an electron app which I have installed on my linux desktop, but I also would like it to function as a PWA which I can access from my phone or
other computers. It has a fairly standard directory structure with

main/ - where all local electron device code lives
renderer/ - where all the frontend UI/PWA stuff lives

All the data I use is currently in a seperate git repository/local folder called serial-bowl-assets and comes in the following structure:
library.json -- the central json with information described below
images/ -- directory with all the saved images

library.json is an array of Story objects with the following structure:
export type StoryStatus = 'reading' | 'complete' | 'broken' | 'hidden' | 'hiatus' | 'dropped';
{
    title: string; --title of the story, assumed to be unique to each story
    coverImage: string; -- either a url linking to the image or the name of the image in the images/ directory
    summary: string; -- just a string with the summary, can sometimes be pretty long
    homepageURL: string; -- url to the website where I access the story
    checkForUpdates: boolean; -- whether the app should be actively checking for updates
    status: StoryStatus; -- broken means I am currently unable to track and hidden means it will not display by default
    additionalInfo: Record<string, string>; -- arbitrary json object used to store any other information I need about that particular story, often just an extra url or two for tracking
    chapters: ChapterData[]; -- array of chapters (ordered start -> end)
}


ChapterData {
    isRead: boolean; -- have I read it
    title: string; -- title of the chapter, often will be in a particular format parse to figure out what chapter number it is depending on the site
    url: string | null; -- url to the chapter, can be null if the site/chapter no longer exists
    datePublished: string; -- date published (or tracked if no publish date can be found)
    dateRead: string | null; -- date most recently read (null if I haven't read it)
}

Each story can have anywhere between 10-5000 chapters, and I am currently tracking about 150 stories. 