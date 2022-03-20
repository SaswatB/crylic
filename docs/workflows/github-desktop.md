# Working with Git

Many modern software projects use software to store files and track changes. Git is one of the most popular solutions used by developers. Normally utilizing Git requires technical knowledge, but fortunately programs have been developed that make this process easy. This guide goes over an example workflow utilizing GitHub Desktop to easily work with changes from Crylic on your team's project hosted on GitHub.

{% hint style="success" %}
Utilizing Git directly from Crylic is in the roadmap
{% endhint %}

### Getting started

To get started, download and install [GitHub Desktop](https://desktop.github.com).

![GitHub Desktop's welcome screen](<../.gitbook/assets/image (10).png>)

In Git, code is stored in a 'repository'. Your development team should be able to provide a link that can be used to 'clone' (download a copy of) your project's repository. You may need a GitHub account that has permissions to access your team's code.

![Example of cloning a repository](../.gitbook/assets/image.png)

### Working with Git and Crylic

After cloning a repository, GitHub Desktop provides an interface to manage your copy. This includes the ability to download new code changes made by your development team, and track your changes made through Crylic.

![Viewing a freshly cloned repository](<../.gitbook/assets/image (3).png>)

There are a lot of features and capabilities built into Git and GitHub Desktop, but to keep this guide simple we'll go through an example of making a change in Crylic.

{% hint style="warning" %}
If Crylic has issues working with your project, a developer may need to follow the [onboarding guide ](broken-reference)to get it working.
{% endhint %}

After opening a project, making changes, and saving with Crylic, GitHub Desktop will show the code changes you made.

![Example change of making an element bold](<../.gitbook/assets/image (6).png>)

At this point, these changes can be put into a 'pull request'. Developers can review requests, make changes if necessary, and add the changes to the live version of the project.

To create a pull request, first create a 'branch' (a new version of the project) with a short name representing your changes.

![GitHub Desktop allows creating branches within the current branch menu](<../.gitbook/assets/image (7).png>)

![Branch names aren't too important, but need to be unique](<../.gitbook/assets/image (4).png>)

![Make sure to bring changes over to the new branch!](<../.gitbook/assets/image (5).png>)

Next create a 'commit' (a bundle of changes that get tracked together) using the lower left menu. The summary and description should cover what you changed and why.

![Good commit messages help developers understand changes when reviewing](<../.gitbook/assets/image (2).png>)

Only a couple steps left! Next the branch needs to be published so that others in your team can view it.

![GitHub Desktop automatically provides an option to publish a new branch with commits](<../.gitbook/assets/image (12).png>)

After that, a pull request can be created!

![GitHub Desktop automatically provides an option to create a pull request for published branches](<../.gitbook/assets/image (9).png>)

![GitHub allows specifying additional details, including images, within the pull request online](<../.gitbook/assets/image (1).png>)

![](<../.gitbook/assets/image (11).png>)

At this point a developer can review the request!

{% hint style="info" %}
After making changes, make sure to switch back to your project's default branch (or the branch your developers recommend to use), and be sure to fetch the latest changes to keep up with the work being done by others.
{% endhint %}

### Additional Tips

Branches can be thought of as similar to variants in design tools such as Figma. By default there's a default branch, which is like a default variant. A new branch is like copying the default variant to have space for new changes. Adding a commit is similar to making changes specifically on the new variant. And finally, creating a pull request is essentially making a request to copy changes from the new variant back to the default variant.

{% hint style="warning" %}
By default branches don't get automatically updated when there's changes in the original.
{% endhint %}
