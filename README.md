# AzurPromilia-Reddit-Integration

This repository contains the Reddit integration component of **Lumii**, a non-commercial Discord community bot for a Japanese fan community dedicated to **Azur Promilia**.

This public repository is provided specifically for review related to Reddit Data API access.

The main Discord bot repository is private.

## Purpose

The integration is intended to:

- Read the newest public posts from `r/AzurPromilia`
- Check for new posts approximately once every 15 minutes
- Notify a Japanese-speaking Discord community when a new post is detected
- Clearly identify Reddit as the source
- Display the Reddit author's username
- Provide a direct link to the original Reddit post
- Provide a clearly labeled machine-generated Japanese translation when applicable

The purpose of the translation is to reduce the language barrier for Japanese-speaking users and help them discover discussions taking place on Reddit.

The original Reddit post will always be linked.

## Reddit Access

The application requires only limited, read-only access to public Reddit data.

The application will not:

- Submit posts
- Submit comments
- Vote
- Send Reddit private messages
- Perform moderation actions
- Profile Reddit users
- Perform user analytics
- Bulk-export Reddit content
- Build a historical Reddit dataset
- Use Reddit content to train or fine-tune AI or machine-learning models

Access will be limited to the newest public posts from:

- `r/AzurPromilia`

Expected normal request frequency:

- Approximately once every 15 minutes
- Approximately 96 requests per day

## Japanese Translation

When a new Reddit post is detected, its public title and text may be sent to the OpenAI API solely to generate a Japanese translation for that individual Discord notification.

The generated translation will be clearly identified as machine-generated.

Reddit content will not be used to train or fine-tune an AI model.

Users will always be provided with a direct link to the original Reddit post.

## Data Retention

The application does not intend to permanently store:

- Reddit post bodies
- Reddit images
- Generated Japanese translations

Only minimal metadata required to prevent duplicate Discord notifications may be stored.

This may include:

- Reddit post ID
- Reddit post URL
- Reddit post title
- Publication timestamp
- Discord message ID
- Notification timestamp

## Why Devvit Is Not Used

The application needs to detect new public posts from `r/AzurPromilia`.

I am not a moderator of `r/AzurPromilia` and have no relationship with its moderation team, so I do not have permission to install a Devvit application in that subreddit.

The application is also part of an existing external Discord bot hosted outside Reddit.

For these reasons, limited read-only Reddit Data API access is requested.

## Project Status

This integration is currently under development.

The existing prototype used Reddit's public RSS feed for development and testing. The production implementation is intended to use the Reddit Data API if access is approved.

Credentials and secrets are not included in this repository.
